/* eslint-disable @typescript-eslint/no-explicit-any */
// actions/referral-actions.ts
"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-server";

import { ReferralType } from "@prisma/client"; // Import Enum từ Prisma

export async function getMyReferralHistory(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ReferralType; // <--- Thêm tham số lọc loại khách hàng
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: "Bạn chưa đăng nhập",
        data: [],
        total: 0,
      };
    }

    const { page = 1, pageSize = 10, search = "", type } = params;
    const skip = (page - 1) * pageSize;

    // 1. Khởi tạo điều kiện lọc cơ bản
    const whereCondition: any = {
      referrerId: user.id,
    };

    // 2. Thêm lọc theo loại khách hàng (SELL, BUY, VALUATION,...) nếu có
    if (type) {
      whereCondition.type = type;
    }

    // 3. Thêm lọc theo từ khóa tìm kiếm (Search)
    if (search) {
      whereCondition.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { licensePlate: { contains: search } },
        {
          leadCar: {
            licensePlate: { contains: search },
          },
        },
      ];
    }

    // Thực hiện đếm tổng số bản ghi theo điều kiện lọc
    const totalCount = await db.customer.count({
      where: whereCondition,
    });

    // Truy vấn dữ liệu
    const referrals = await db.customer.findMany({
      where: whereCondition,
      include: {
        carModel: { select: { name: true, grade: true } },
        assignedTo: { select: { fullName: true, phone: true } },
        leadCar: { select: { licensePlate: true, modelName: true } },
        activities: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: skip,
      take: pageSize,
    });

    // Xử lý dữ liệu trước khi trả về UI
    const processedData = referrals.map((item) => {
      const isSuccess = item.status === "DEAL_DONE";

      let groupLabel = "Đang xử lý";
      if (isSuccess) groupLabel = "Thành công";
      if (
        ["LOSE", "CANCELLED", "REJECTED_APPROVAL", "FROZEN"].includes(
          item.status,
        )
      ) {
        groupLabel = "Kết thúc/Từ chối";
      }

      return {
        ...item,
        groupLabel,
        isSuccess,
        careHistory: item.activities.map((act) => ({
          createdAt: act.createdAt,
          result: act.note,
          status: act.status,
          staffName: act.user?.fullName,
        })),
      };
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(processedData)),
      total: totalCount,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Lỗi lấy lịch sử giới thiệu:", error);
    return { success: false, message: "Lỗi hệ thống", data: [], total: 0 };
  }
}
