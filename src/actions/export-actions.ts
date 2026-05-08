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

  // 1. Lấy cấu hình LeadSetting (Dùng để so sánh ngày HOT/WARM và độ trễ xử lý)
  const leadConfig = await db.leadSetting.findFirst({
    where: { id: "lead_config" }, // Theo ID default trong schema của bạn
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

  // 3. Truy vấn dữ liệu với đầy đủ các quan hệ
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
      carModel: { select: { name: true, grade: true } },
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
        orderBy: { deadlineAt: "asc" },
        take: 1,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          user: { select: { fullName: true } },
          reason: { select: { content: true } }, // Quan trọng: Lấy nội dung lý do từ LeadReason
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Transform dữ liệu & Xử lý Logic nghiệp vụ
  const serializedData = customers.map((customer) => {
    const latestActivity = customer.activities[0];
    const leadCar = customer.leadCar;

    // Tìm lý do đóng băng (Tìm trong lịch sử bản ghi có trạng thái FROZEN)
    const frozenActivity = customer.activities.find(
      (a) => a.status === "FROZEN",
    );
    const frozenReason =
      frozenActivity?.reason?.content || frozenActivity?.note || "N/A";

    // Tìm lý do thất bại (Tìm trong lịch sử bản ghi có trạng thái LOSE hoặc CANCELLED)
    const lostActivity = customer.activities.find(
      (a) => a.status === "LOSE" || a.status === "CANCELLED",
    );
    const lostReason =
      lostActivity?.reason?.content || lostActivity?.note || "N/A";

    // --- LOGIC A: Xử lý TYPE (ReferralType) nếu NULL ---

    // --- LOGIC B: Kiểm tra liên hệ gần nhất & Độ trễ ---
    // Lấy ngày liên hệ thực tế từ activity mới nhất hoặc trường lastContactAt
    const actualLastContactDate =
      latestActivity?.createdAt || customer.lastContactAt;

    let isCurrentlyLate = customer.isLate;
    if (
      leadConfig &&
      customer.status === "ASSIGNED" &&
      customer.assignedAt &&
      !customer.firstContactAt
    ) {
      // Nếu đã bàn giao mà chưa liên hệ lần đầu, so sánh với maxLateMinutes
      const minutesSinceAssigned = dayjs().diff(
        dayjs(customer.assignedAt),
        "minute",
      );
      if (minutesSinceAssigned > leadConfig.maxLateMinutes) {
        isCurrentlyLate = true;
      }
    }

    // --- LOGIC C: Tính toán UrgencyLevel nếu NULL (Dựa trên LeadSetting) ---
    let calculatedUrgency = customer.urgencyLevel;
    if (!calculatedUrgency && leadConfig) {
      const daysOld = dayjs().diff(dayjs(customer.createdAt), "day");
      if (daysOld <= leadConfig.hotDays) calculatedUrgency = "HOT";
      else if (daysOld <= leadConfig.warmDays) calculatedUrgency = "WARM";
      else calculatedUrgency = "COOL";
    }

    return {
      ...customer,
      // Ghi đè các giá trị đã qua tính toán
      frozenReason: customer.status === "FROZEN" ? frozenReason : "N/A",
      lostReason:
        customer.status === "LOSE" || customer.status === "CANCELLED"
          ? lostReason
          : "N/A",
      urgencyLevel: calculatedUrgency,
      isLate: isCurrentlyLate,

      // Dữ liệu bổ sung cho Excel Helper dễ đọc
      lastContactFormatted: actualLastContactDate
        ? dayjs(actualLastContactDate).format("DD/MM/YYYY HH:mm")
        : "Chưa liên hệ",
      lastActivityNote:
        latestActivity?.note || customer.lastContactResult || "N/A",
      lastActivityStaff: latestActivity?.user?.fullName || "N/A",
      inspectDoneDate: customer?.inspectDoneDate,
      // Xử lý Decimal cho LeadCar
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

      // Task tiếp theo
      nextAction: customer.tasks[0]
        ? `${customer.tasks[0].title} (${dayjs(customer.tasks[0].scheduledAt).format("DD/MM")})`
        : "Không có lịch hẹn",
    };
  });

  return serializedData;
}
