/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import dayjs from "@/lib/dayjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-server";
import { revalidatePath } from "next/cache";

// --- HELPER: BIẾN ĐỔI DECIMAL/DATE SANG JSON THUẦN ---
function serializeContract(contract: any) {
  if (!contract) return null;
  return {
    ...contract,
    // Chuyển Decimal sang Number
    totalAmount: contract.totalAmount ? Number(contract.totalAmount) : 0,
    depositAmount: contract.depositAmount ? Number(contract.depositAmount) : 0,
    // Chuyển Date sang ISO String
    createdAt: contract.createdAt?.toISOString(),
    updatedAt: contract.updatedAt?.toISOString(),
    signedAt: contract.signedAt?.toISOString() || null,
    expiredAt: contract.expiredAt?.toISOString() || null,
    // Xử lý đệ quy cho các quan hệ nếu có Decimal (như giá xe)
    car: contract.car
      ? {
          ...contract.car,
          costPrice: contract.car.costPrice
            ? Number(contract.car.costPrice)
            : 0,
          sellingPrice: contract.car.sellingPrice
            ? Number(contract.car.sellingPrice)
            : 0,
        }
      : null,
  };
}

export async function getContractsAction(filters?: {
  contractNumber?: string;
  customerName?: string;
  licensePlate?: string;
  staffId?: string;
}) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Chưa đăng nhập");

  const isGlobalManager = auth.role === "ADMIN" || auth.isGlobalManager;

  // 1. Khởi tạo điều kiện lọc cơ bản (Phân quyền)
  const baseWhere: any = {};

  if (!isGlobalManager) {
    if (auth.role === "MANAGER") {
      // Manager chi nhánh: Thấy hợp đồng thuộc chi nhánh mình
      baseWhere.car = { branchId: auth.branchId };
    } else {
      // Nhân viên bình thường: Chỉ thấy hợp đồng của mình
      baseWhere.staffId = auth.id;
    }
  }

  // 2. Kết hợp với các bộ lọc từ UI (Filters)
  const filterWhere: any = { AND: [baseWhere] };

  if (filters) {
    if (filters.contractNumber) {
      filterWhere.AND.push({
        contractNumber: { contains: filters.contractNumber },
      });
    }
    if (filters.customerName) {
      filterWhere.AND.push({
        customer: { fullName: { contains: filters.customerName } },
      });
    }
    if (filters.licensePlate) {
      filterWhere.AND.push({
        car: { licensePlate: { contains: filters.licensePlate } },
      });
    }
    // Chỉ áp dụng lọc theo staffId nếu là sếp (Admin/Manager)
    if (isGlobalManager || auth.role === "MANAGER") {
      if (filters.staffId) {
        filterWhere.AND.push({ staffId: filters.staffId });
      }
    }
  }

  // 3. Thực hiện truy vấn
  const contracts = await db.contract.findMany({
    where: filterWhere,
    include: {
      customer: {
        select: {
          fullName: true,
          phone: true,
          address: true,
          type: true,
          carImages: true,
          documents: true,
        },
      },
      car: {
        select: {
          modelName: true,
          stockCode: true,
          licensePlate: true,
          vin: true,
          engineNumber: true,
          costPrice: true,
          sellingPrice: true,
          branchId: true,
        },
      },
      staff: {
        select: {
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify(contracts));
}

/**
 * Tương tự cho hàm lấy chi tiết, cũng nên kiểm tra quyền truy cập
 * để tránh việc nhân viên biết ID hợp đồng của người khác và truy cập lậu
 */
export async function getContractDetailAction(id: string) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Chưa đăng nhập");

  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      customer: {
        include: {
          inspectorRef: true,
          leadCar: true,
          referrer: true,
          branch: true,
        },
      }, // Lấy full thông tin khách hàng bao gồm ảnh/tài liệu
      car: true, // Lấy full thông tin xe
      staff: {
        select: { fullName: true, username: true },
      },
    },
  });

  if (!contract) throw new Error("Không tìm thấy hợp đồng");

  // Kiểm tra bảo mật cơ bản: Nếu không phải sếp và không phải chủ hợp đồng
  const isGlobalManager = auth.role === "ADMIN" || auth.isGlobalManager;
  if (!isGlobalManager && contract.staffId !== auth.id) {
    // Nếu là manager chi nhánh thì kiểm tra chi nhánh của xe
    if (auth.role === "MANAGER" && contract.car.branchId === auth.branchId) {
      // Hợp lệ
    } else {
      throw new Error("Bạn không có quyền xem hợp đồng này");
    }
  }

  return JSON.parse(JSON.stringify(contract));
}

export async function completeContractAction(contractId: string) {
  try {
    const auth = await getCurrentUser();
    if (!auth) throw new Error("Chưa đăng nhập");

    const result = await db.$transaction(
      async (tx) => {
        // 1. Lấy thông tin HĐ
        const contract = await tx.contract.findUnique({
          where: { id: contractId },
        });
        if (!contract) throw new Error("Hợp đồng không tồn tại");

        // 2. Cập nhật Hợp đồng thành COMPLETED
        const updatedContract = await tx.contract.update({
          where: { id: contractId },
          data: {
            status: "COMPLETED",
            signedAt: new Date(),
          },
        });

        // 3. Cập nhật Xe thành SOLD
        await tx.car.update({
          where: { id: contract.carId },
          data: {
            status: "SOLD",
            soldAt: new Date(),
            soldById: contract.staffId,
          },
        });

        // 4. Cập nhật Khách hàng thành DEAL_DONE
        await tx.customer.update({
          where: { id: contract.customerId },
          data: { status: "DEAL_DONE" },
        });

        // 5. Tạo Task nhắc bảo dưỡng sau 1 tháng
        await tx.task.create({
          data: {
            title: "📞 NHẮC BẢO DƯỠNG (1 THÁNG SAU MUA)",
            type: "MAINTENANCE",
            scheduledAt: dayjs().add(1, "month").toDate(),
            deadlineAt: dayjs().add(1, "month").add(3, "day").toDate(),
            customerId: contract.customerId,
            assigneeId: contract.staffId,
          },
        });

        return updatedContract;
      },
      {
        timeout: 20000, // Thêm cấu hình timeout ở đây
      },
    );

    revalidatePath("/dashboard/contracts");
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Complete Contract Error:", error);
    return { success: false, error: error.message };
  }
}

// Cập nhật file hợp đồng
export async function uploadContractFileAction(
  contractId: string,
  base64Data: string,
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) throw new Error("Chưa đăng nhập");

    if (!base64Data) {
      return { success: false, error: "Dữ liệu tệp trống" };
    }

    // 1. Kiểm tra dung lượng chuỗi Base64 để tránh lỗi quá tải Vercel Serverless (Max 4.5MB)
    // Công thức tính xấp xỉ dung lượng thực tế từ độ dài chuỗi Base64
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxAllowedSize = 4.5 * 1024 * 1024; // 4.5 Megabytes

    if (sizeInBytes > maxAllowedSize) {
      return {
        success: false,
        error:
          "Dung lượng file quá lớn. Vui lòng nén file hoặc chọn file < 3MB để tránh quá tải server Vercel.",
      };
    }

    // 2. Tiến hành update trực tiếp chuỗi Base64 vào DB bằng Prisma
    await db.contract.update({
      where: { id: contractId },
      data: { contractFile: base64Data },
    });

    revalidatePath("/dashboard/contracts");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi lưu Base64 vào DB:", error);
    return {
      success: false,
      error: error.message || "Không thể lưu file vào cơ sở dữ liệu",
    };
  }
}

/**
 * Lấy danh sách nhân viên (Sale/Thu mua) phục vụ bộ lọc Select.
 * Phân quyền dựa trên vai trò của người đang đăng nhập.
 */
export async function getStaffForFilterAction() {
  try {
    const auth = await getCurrentUser();
    if (!auth) return [];

    // Quyền tối cao hoặc Quản lý tổng
    const isGlobalPower = auth.role === "ADMIN" || auth.isGlobalManager;

    const staff = await db.user.findMany({
      where: {
        active: true,
        // Chỉ lấy những người có vai trò liên quan đến giao dịch hợp đồng
        role: {
          in: ["SALES_STAFF", "PURCHASE_STAFF", "MANAGER"],
        },
        // Nếu không có quyền Global, chỉ lấy nhân viên cùng chi nhánh
        ...(!isGlobalPower ? { branchId: auth.branchId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        branch: {
          select: { name: true },
        },
      },
      orderBy: {
        fullName: "asc",
      },
    });

    // Chuyển đổi thành Plain Object để tránh lỗi truyền dữ liệu Client Component
    return JSON.parse(JSON.stringify(staff));
  } catch (error) {
    console.error("Lỗi getStaffForFilterAction:", error);
    return [];
  }
}
