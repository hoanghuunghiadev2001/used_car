/* eslint-disable @typescript-eslint/no-explicit-any */
// src/actions/export-actions.ts
"use server";

import dayjs from "@/lib/dayjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-server";

export async function getExportCustomerData(
  startDate?: Date,
  endDate?: Date,
  branchId?: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Lấy cấu hình LeadSetting
  const leadConfig = await db.leadSetting.findFirst({
    where: { id: "lead_config" },
  });

  // 2. Thiết lập điều kiện lọc (Where Clause)
  const whereClause: any = {};

  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: dayjs.tz(startDate, "Asia/Ho_Chi_Minh").startOf("day").toDate(),
      lte: dayjs.tz(endDate, "Asia/Ho_Chi_Minh").endOf("day").toDate(),
    };
  }

  // Phân quyền chi nhánh
  if (
    user.role !== "ADMIN" &&
    !user.isGlobalManager &&
    user.role !== "SALE_MANAGER"
  ) {
    whereClause.branchId = user.branchId;
  } else if (branchId && branchId !== "ALL") {
    whereClause.branchId = branchId;
  }

  // 3. Truy vấn dữ liệu (Bỏ hoàn toàn orderBy tầng DB để cứu RAM sort_buffer_size)
  const customers = await db.customer.findMany({
    where: whereClause,
    include: {
      branch: { select: { name: true } },
      assignedTo: { select: { fullName: true } },
      inspectorRef: { select: { fullName: true } },
      referrer: {
        select: {
          fullName: true,
          department: { select: { name: true } },
        },
      },
      tradeInModel: { select: { name: true, grade: true } },
      carModel: true,
      leadCar: {
        select: {
          modelName: true,
          grade: true,
          year: true,
          odo: true,
          tSurePrice: true,
          expectedPrice: true,
          finalPrice: true,
          color: true,
        },
      },
      contracts: { select: { id: true } },
      tasks: {
        where: { status: "PENDING" },
        // ❌ Đã xóa orderBy tầng DB
      },
      activities: {
        // ❌ Đã xóa orderBy tầng DB
        include: {
          user: { select: { fullName: true } },
          reason: { select: { content: true } },
        },
      },
    },
    // ❌ Đã xóa orderBy ở bảng cha Customer
  });

  // 4. Transform dữ liệu & Tự Sắp xếp bằng JavaScript (Tầng Node.js)
  const serializedData = customers.map((customer) => {
    // Tự sắp xếp mảng phụ bằng JS thay vì bắt MySQL gồng gánh
    const sortedActivities = [...customer.activities].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const sortedTasks = [...customer.tasks].sort(
      (a, b) =>
        new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime(),
    );

    const latestActivity = sortedActivities[0];
    const leadCar = customer.leadCar;

    // Tìm lý do đóng băng
    const frozenActivity = sortedActivities.find((a) => a.status === "FROZEN");
    const frozenReason =
      frozenActivity?.reason?.content || frozenActivity?.note || "N/A";

    // Tìm lý do thất bại
    const lostActivity = sortedActivities.find(
      (a) => a.status === "LOSE" || a.status === "CANCELLED",
    );
    const lostReason =
      lostActivity?.reason?.content || lostActivity?.note || "N/A";

    // --- LOGIC B: Kiểm tra liên hệ gần nhất & Độ trễ ---
    const actualLastContactDate =
      latestActivity?.createdAt || customer.lastContactAt;

    let isCurrentlyLate = customer.isLate;
    if (
      leadConfig &&
      customer.status === "ASSIGNED" &&
      customer.assignedAt &&
      !customer.firstContactAt
    ) {
      const minutesSinceAssigned = dayjs().diff(
        dayjs(customer.assignedAt),
        "minute",
      );
      if (minutesSinceAssigned > leadConfig.maxLateMinutes) {
        isCurrentlyLate = true;
      }
    }

    // --- LOGIC C: Tính toán UrgencyLevel nếu NULL ---
    let calculatedUrgency = customer.urgencyLevel;
    if (!calculatedUrgency && leadConfig) {
      const daysOld = dayjs().diff(dayjs(customer.createdAt), "day");
      if (daysOld <= leadConfig.hotDays) calculatedUrgency = "HOT";
      else if (daysOld <= leadConfig.warmDays) calculatedUrgency = "WARM";
      else calculatedUrgency = "COOL";
    }

    return {
      ...customer,
      frozenReason: customer.status === "FROZEN" ? frozenReason : "N/A",
      lostReason:
        customer.status === "LOSE" || customer.status === "CANCELLED"
          ? lostReason
          : "N/A",
      urgencyLevel: calculatedUrgency,
      isLate: isCurrentlyLate,

      lastContactFormatted: actualLastContactDate
        ? dayjs(actualLastContactDate).format("DD/MM/YYYY HH:mm")
        : "Chưa liên hệ",
      lastActivityNote:
        latestActivity?.note || customer.lastContactResult || "N/A",
      lastActivityStaff: latestActivity?.user?.fullName || "N/A",
      inspectDoneDate: customer?.inspectDoneDate,

      leadCar: leadCar
        ? {
            ...leadCar,
            tSurePrice: leadCar.tSurePrice ? Number(leadCar.tSurePrice) : null,
            expectedPrice: leadCar.expectedPrice
              ? Number(leadCar.expectedPrice)
              : null,
            finalPrice: leadCar.finalPrice ? Number(leadCar.finalPrice) : null,
            odo: leadCar.odo ? Number(leadCar.odo) : null,
          }
        : null,

      nextAction: sortedTasks[0]
        ? `${sortedTasks[0].title} (${dayjs(sortedTasks[0].scheduledAt).format("DD/MM")})`
        : "Không có lịch hẹn",
    };
  });

  // 🔥 Sắp xếp mảng trả về cuối cùng theo ngày tạo giảm dần (createdAt DESC) bằng JavaScript
  return serializedData.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
