/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { revalidatePath } from "next/cache";
import {
  LeadStatus,
  CarStatus,
  Transmission,
  FuelType,
  CarType,
  UrgencyType,
  TaskStatus,
  Role,
  TaskType,
} from "@prisma/client";
import dayjs from "@/lib/dayjs"; // Sử dụng file config ở trên
import { getCurrentUser } from "@/lib/session-server";
import { sendMail } from "@/lib/mail-service";
import {
  contactActivityEmailTemplate,
  dealApprovalRequestEmailTemplate,
  dealResultEmailTemplate,
  loseApprovalRequestEmailTemplate,
  loseResultEmailTemplate,
  purchaseResultEmailTemplate,
  referrerLoseResultEmailTemplate,
  saleApprovalRequestEmailTemplate,
  selfCreatedLeadEmailTemplate,
  staffLoseResultEmailTemplate,
  unfreezeAssignmentEmailTemplate,
} from "@/lib/mail-templates";

const serializePrisma = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

/** --- QUERIES --- */
export async function getActiveReasonsAction(type: LeadStatus) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");
  const reasons = await db.leadReason.findMany({
    where: { type, active: true },
    orderBy: { content: "asc" },
  });
  console.log(reasons);

  return serializePrisma(reasons);
}

export async function getMyTasksAction(filters?: any) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return [];

    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    let taskTypeFilter: any = undefined;

    // Phân loại nghiệp vụ dựa trên Role
    if (user.role === Role.SALES_STAFF) {
      taskTypeFilter = TaskType.SALES;
    } else if (user.role === Role.PURCHASE_STAFF) {
      taskTypeFilter = TaskType.PURCHASE;
    }

    // 1. Xây dựng điều kiện lọc (WHERE clause)
    const whereCondition: any = {
      assigneeId: user.id,
      status: "PENDING", // Chỉ lấy các nhiệm vụ đang chờ xử lý
      ...(taskTypeFilter && { type: taskTypeFilter }),
    };

    // Khởi tạo lọc lồng nhau cho quan hệ Customer
    whereCondition.customer = {};

    if (filters) {
      if (filters.urgencyLevel && filters.urgencyLevel !== "ALL") {
        whereCondition.customer.urgencyLevel = filters.urgencyLevel;
      }
      // Lọc theo Tên hoặc Số điện thoại
      if (filters.searchText) {
        whereCondition.customer.OR = [
          { fullName: { contains: filters.searchText } },
          { phone: { contains: filters.searchText } },
        ];
      }

      // Lọc theo Biển số xe (Nằm trong bảng LeadCar lồng trong Customer)
      if (filters.licensePlate) {
        whereCondition.customer.leadCar = {
          licensePlate: { contains: filters.licensePlate },
        };
      }

      if (filters.carModelName) {
        whereCondition.customer.carModel = {
          name: {
            contains: filters.carModelName,
          },
        };
      }

      // Lọc theo Trạng thái xem xe (INSPECTED, NOT_INSPECTED, APPOINTED)
      if (filters.inspectStatus && filters.inspectStatus !== "ALL") {
        whereCondition.customer.inspectStatus = filters.inspectStatus;
      }

      // Lọc theo Khoảng ngày nhận thông tin (Ngày tạo Lead/Customer)
      if (filters.dateRange && filters.dateRange.length === 2) {
        whereCondition.customer.createdAt = {
          gte: dayjs(filters.dateRange[0]).startOf("day").toDate(),
          lte: dayjs(filters.dateRange[1]).endOf("day").toDate(),
        };
      }

      // Lọc theo Khoảng ngày cần liên hệ (Ngày hẹn trên Task)
      if (filters.contactDateRange && filters.contactDateRange.length === 2) {
        whereCondition.scheduledAt = {
          gte: dayjs(filters.contactDateRange[0]).startOf("day").toDate(),
          lte: dayjs(filters.contactDateRange[1]).endOf("day").toDate(),
        };
      }
    }

    // 2. Thực thi truy vấn Database
    const [config, tasks] = await Promise.all([
      db.leadSetting.findFirst(),
      db.task.findMany({
        where: whereCondition,
        include: {
          customer: {
            include: {
              carModel: { select: { id: true, name: true } },
              referrer: { select: { fullName: true } },
              leadCar: true,
              activities: {
                include: {
                  user: { select: { fullName: true } },
                },
                orderBy: { createdAt: "desc" },
              },
              inspectorRef: { select: { fullName: true } },
              notSeenReasonRef: { select: { name: true } },
              sellReason: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledAt: "asc" }, // Sắp xếp theo lịch hẹn gần nhất
      }),
    ]);

    const maxLate = config?.maxLateMinutes || 30;

    // 3. Xử lý hậu kỳ (Mapping dữ liệu)
    const processedTasks = tasks.map((task) => {
      const customer = task.customer;
      const scheduledAtVN = dayjs(task.scheduledAt).tz("Asia/Ho_Chi_Minh");
      const deadline = scheduledAtVN.add(maxLate, "minute");

      // Tính toán trạng thái trễ hạn
      const isOverdue = now.isAfter(deadline);
      const minutesOverdue = isOverdue ? now.diff(deadline, "minute") : 0;

      // Ép kiểu Decimal sang Number để tránh lỗi JSON/Client
      const rawLeadCar = customer?.leadCar;
      const formattedLeadCar = rawLeadCar
        ? {
            ...rawLeadCar,
            tSurePrice: rawLeadCar.tSurePrice
              ? Number(rawLeadCar.tSurePrice)
              : null,
            expectedPrice: rawLeadCar.expectedPrice
              ? Number(rawLeadCar.expectedPrice)
              : null,
            finalPrice: rawLeadCar.finalPrice
              ? Number(rawLeadCar.finalPrice)
              : null,
          }
        : null;

      // Chuyển sang Plain Object an toàn
      const plainTask = JSON.parse(JSON.stringify(task));

      return {
        ...plainTask,
        isOverdue,
        minutesOverdue,
        customer: {
          ...plainTask.customer,
          leadCar: formattedLeadCar,
        },
      };
    });

    return serializePrisma(processedTasks);
  } catch (error) {
    console.error("Error in getMyTasksAction:", error);
    return [];
  }
}
/** --- MUTATIONS --- */

// 1. Gửi duyệt Thu mua (Lưu toàn bộ form bao gồm Hợp đồng vào JSON)
export async function requestPurchaseApproval(leadId: string, values: any) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  if (!values.carData || !values.contractData) {
    throw new Error("Dữ liệu xe hoặc hợp đồng không đầy đủ");
  }

  try {
    const now = new Date();

    // 1. Chuẩn hóa dữ liệu kỹ thuật xe (Cho bảng LeadCar)
    const { carImages, documents, ...carTechnicalInfo } = values.carData;

    const formattedLeadCarData = {
      ...carTechnicalInfo,
      year: carTechnicalInfo.year ? Number(carTechnicalInfo.year) : null,
      odo: carTechnicalInfo.odo ? Number(carTechnicalInfo.odo) : 0,
      seats: carTechnicalInfo.seats ? Number(carTechnicalInfo.seats) : 5,
      registrationDeadline: carTechnicalInfo.registrationDeadline
        ? new Date(carTechnicalInfo.registrationDeadline)
        : null,
      insuranceDeadline: carTechnicalInfo.insuranceDeadline
        ? new Date(carTechnicalInfo.insuranceDeadline)
        : null,
      insuranceVCDeadline: carTechnicalInfo.insuranceVCDeadline
        ? new Date(carTechnicalInfo.insuranceVCDeadline)
        : null,
      insuranceTNDSDeadline: carTechnicalInfo.insuranceTNDSDeadline
        ? new Date(carTechnicalInfo.insuranceTNDSDeadline)
        : null,
      finalPrice: values.contractData.price
        ? Number(values.contractData.price)
        : 0,
      authorizedOwnerName: values.contractData.authorizedOwnerName,
      contractNo: values.contractData.contractNo,
    };

    const result = await db.$transaction(
      async (tx) => {
        // 2. Lấy thông tin khách hàng & Kiểm tra tính chính trực của dữ liệu
        const customer = await tx.customer.findUnique({
          where: { id: leadId },
          include: { branch: true },
        });

        if (!customer) throw new Error("Không tìm thấy khách hàng");
        if (customer.status === LeadStatus.PENDING_DEAL_APPROVAL) {
          throw new Error("Hồ sơ này đã được gửi duyệt trước đó");
        }

        // Xác định nếu nhân viên hiện tại tự giới thiệu khách này
        const isSelfReferral = customer.referrerId === auth.id;

        // 3. XỬ LÝ ĐÓNG TẤT CẢ CÁC TASK ĐANG MỞ
        // Tìm tất cả task PENDING của khách hàng này
        const openTasks = await tx.task.findMany({
          where: {
            customerId: leadId,
            status: "PENDING",
          },
        });

        if (openTasks.length > 0) {
          const updateTaskPromises = openTasks.map((t) => {
            let isLate = false;
            let lateMinutes = 0;

            // Logic: Nếu không phải tự giới thiệu và đã quá hạn thì tính trễ
            if (!isSelfReferral && now > t.deadlineAt) {
              isLate = true;
              lateMinutes = Math.floor(
                (now.getTime() - t.deadlineAt.getTime()) / (1000 * 60),
              );
            }

            return tx.task.update({
              where: { id: t.id },
              data: {
                status: "COMPLETED",
                completedAt: now,
                isLate: isLate,
                lateMinutes: lateMinutes,
                content: `Đã đóng tự động khi gửi duyệt thu mua. Giá chốt: ${Number(values.contractData.price).toLocaleString()}đ`,
              },
            });
          });
          await Promise.all(updateTaskPromises);
        }

        // 4. Cập nhật bảng Customer
        await tx.customer.update({
          where: { id: leadId },
          data: {
            status: LeadStatus.PENDING_DEAL_APPROVAL,
            nextContactAt: null, // Xóa lịch hẹn tiếp theo vì đã chốt
            carImages: carImages || [],
            documents: documents || [],
          },
        });

        // 5. Đồng bộ vào LeadCar (Dữ liệu chi tiết xe định giá)
        await tx.leadCar.upsert({
          where: { customerId: leadId },
          update: formattedLeadCarData,
          create: {
            customerId: leadId,
            authorizedOwnerName: formattedLeadCarData.authorizedOwnerName,
            contractNo: formattedLeadCarData.contractNo,
            ...formattedLeadCarData,
          },
        });

        // 6. Tạo Activity Log (Snapshot)
        const activity = await tx.leadActivity.create({
          data: {
            customerId: leadId,
            status: LeadStatus.PENDING_DEAL_APPROVAL,
            note: `[YÊU CẦU DUYỆT MUA] HĐ: ${values.contractData.contractNo}. Xe: ${formattedLeadCarData.modelName}. Giá: ${Number(values.contractData.price).toLocaleString()}đ.${isSelfReferral ? " (Khách tự khai thác)" : ""}`,
            createdById: auth.id,
          },
        });

        return {
          activityId: activity.id,
          customerName: customer.fullName,
          branchId: customer.branchId,
          branchName: customer.branch?.name || "Chi nhánh gốc",
        };
      },
      { timeout: 25000 },
    );

    // 7. GỬI THÔNG BÁO EMAIL (Background Task)
    const sendNotification = async () => {
      try {
        const managers = await db.user.findMany({
          where: {
            active: true,
            OR: [
              { isGlobalManager: true },
              { role: "MANAGER", branchId: result.branchId },
            ],
          },
          select: { email: true },
        });

        const managerEmails = managers.map((m) => m.email).filter(Boolean);

        if (managerEmails.length > 0) {
          await sendMail({
            to: managerEmails.join(","),
            subject: `[DUYỆT THU MUA] ${result.customerName.toUpperCase()} - HĐ: ${values.contractData.contractNo}`,
            html: dealApprovalRequestEmailTemplate({
              staffName: auth.fullName || auth.username,
              customerName: result.customerName,
              carName: formattedLeadCarData.modelName,
              licensePlate: formattedLeadCarData.licensePlate,
              dealPrice: Number(values.contractData.price),
              contractNo: values.contractData.contractNo,
              type: "PURCHASE",
              branchName: result.branchName,
            }),
          });
        }
      } catch (err) {
        console.error("Lỗi gửi mail phê duyệt thu mua:", err);
      }
    };
    sendNotification();

    // 8. Revalidate Cache
    revalidatePath("/dashboard/assigned-tasks");
    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/customers/${leadId}`);

    return { success: true, activityId: result.activityId };
  } catch (error: any) {
    console.error("Purchase Approval Error:", error);
    return {
      success: false,
      error: error.message || "Lỗi hệ thống khi gửi duyệt thu mua",
    };
  }
}
// 2. Phê duyệt nhập kho (Giải nén JSON, tạo Car VÀ tạo CarOwnerHistory)

export async function approveCarPurchase(
  activityId: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
  adminUpdatedData?: any,
) {
  const auth = await getCurrentUser();
  if (!auth) return { success: false, error: "Unauthorized" };

  try {
    const activity = await db.leadActivity.findUnique({
      where: { id: activityId },
      include: {
        customer: { include: { branch: true } },
        user: { select: { email: true, fullName: true, username: true } },
      },
    });

    if (!activity) return { success: false, error: "Không tìm thấy yêu cầu" };

    let purchaseData: any = null;
    try {
      purchaseData = JSON.parse(activity.note || "{}");
    } catch (e) {
      purchaseData = {};
    }

    const isPurchaseRequest = activity.status === "PENDING_DEAL_APPROVAL";

    const result = await db.$transaction(
      async (tx) => {
        // --- 1. TRƯỜNG HỢP TỪ CHỐI ---
        if (decision === "REJECT") {
          await tx.customer.update({
            where: { id: activity.customerId },
            data: { status: "FOLLOW_UP" },
          });

          await tx.task.updateMany({
            where: { customerId: activity.customerId, status: "PENDING" },
            data: { status: "CANCELLED" },
          });

          await tx.task.create({
            data: {
              title: "SỬA HỒ SƠ: Thu mua bị từ chối",
              content: `Lý do: ${reason || "Không xác định"}. Vui lòng chỉnh sửa lại thông tin xe và gửi duyệt lại.`,
              type: "PURCHASE",
              scheduledAt: new Date(),
              deadlineAt: dayjs().add(1, "hour").toDate(),
              status: "PENDING",
              customerId: activity.customerId,
              assigneeId: activity.createdById,
            },
          });

          await tx.leadActivity.update({
            where: { id: activityId },
            data: {
              status: "REJECTED_APPROVAL",
              note: `❌ Admin từ chối: ${reason}`,
            },
          });

          return { type: "REJECTED", price: 0 };
        }

        // --- 2. TRƯỜNG HỢP PHÊ DUYỆT ---
        if (isPurchaseRequest) {
          const carData = adminUpdatedData || purchaseData.carData;
          const contractData = adminUpdatedData
            ? {
                price: adminUpdatedData.finalPrice,
                contractNo: adminUpdatedData.contractNo,
              }
            : purchaseData.contractData;

          // Xác định chi nhánh cho xe
          const staff = await tx.user.findUnique({
            where: { id: activity.createdById },
            select: { branchId: true },
          });
          const finalBranchId = staff?.branchId || activity.customer.branchId;
          if (!finalBranchId) throw new Error("Không xác định được chi nhánh.");

          // LỌC DỮ LIỆU SẠCH (Loại bỏ các trường không có trong Schema Car)
          const {
            price,
            contractNo,
            id,
            customerId,
            createdAt,
            updatedAt,
            note,
            adminNote,
            carImages, // Bóc tách ra để loại bỏ khỏi spread
            documents, // Bóc tách ra để loại bỏ khỏi spread
            inspectorName, // Bóc tách ra để loại bỏ khỏi spread
            finalPrice, // 👈 THÊM DÒNG NÀY: Loại bỏ finalPrice vì Car schema không có
            tSurePrice, // 👈 NÊN THÊM: LeadCar có cái này nhưng Car thì không
            ...validCarFields
          } = carData;

          // Logic tạo Stock Code
          const carModelDb = await tx.carModel.findUnique({
            where: { id: carData.carModelId },
          });
          const carTypePrefix = (carModelDb?.grade || "CAR")
            .substring(0, 3)
            .toUpperCase();
          const yearSuffix = new Date().getFullYear().toString().slice(-2);

          const lastCar = await tx.car.findFirst({
            where: {
              stockCode: { startsWith: `${carTypePrefix}${yearSuffix}` },
            },
            orderBy: { stockCode: "desc" },
          });
          const lastNumber = lastCar
            ? parseInt(lastCar.stockCode.slice(-3))
            : 0;
          const generatedStockCode = `${carTypePrefix}${yearSuffix}${(lastNumber + 1).toString().padStart(3, "0")}`;

          // TẠO XE NHẬP KHO
          const createdCar = await tx.car.create({
            data: {
              ...validCarFields,
              stockCode: generatedStockCode,
              vin: carData.vin?.toUpperCase() || null,
              engineNumber: carData.engineNumber?.toUpperCase() || null,
              licensePlate: carData.licensePlate?.toUpperCase() || null,
              year: carData.year
                ? Number(carData.year)
                : new Date().getFullYear(),
              odo: carData.odo ? Number(carData.odo) : 0,
              seats: carData.seats ? Number(carData.seats) : 5,
              costPrice: contractData.price,
              contractNumber: contractData.contractNo,
              modelName: carModelDb?.name ?? "Xe thu mua",
              branchId: finalBranchId,
              purchaserId: activity.createdById,
              referrerId: activity.customer.referrerId,
              purchasedAt: new Date(),
              status: "REFURBISHING",

              // Đảm bảo ép kiểu Date cho các trường deadline
              registrationDeadline: carData.registrationDeadline
                ? new Date(carData.registrationDeadline)
                : null,
              insuranceDeadline: carData.insuranceDeadline
                ? new Date(carData.insuranceDeadline)
                : null,
              insuranceVCDeadline: carData.insuranceVCDeadline
                ? new Date(carData.insuranceVCDeadline)
                : null,
              insuranceTNDSDeadline: carData.insuranceTNDSDeadline
                ? new Date(carData.insuranceTNDSDeadline)
                : null,
              //authorizedOwnerName đã được spread từ validCarFields nếu có trong carData
            },
          });

          // ✅ BỔ SUNG: TẠO HỢP ĐỒNG THU MUA (PURCHASE CONTRACT)
          await tx.contract.create({
            data: {
              contractNumber:
                contractData.contractNo || `PUR-${generatedStockCode}`, // Ưu tiên số HĐ của Admin hoặc tự sinh
              type: "PURCHASE",
              status: "SIGNED", // Thu mua phê duyệt xong coi như đã ký kết
              customerId: activity.customerId,
              carId: createdCar.id,
              staffId: activity.createdById, // Nhân viên thu mua phụ trách
              totalAmount: contractData.price,
              depositAmount: 0, // Thu mua thường thanh toán thẳng hoặc cọc tùy deal, mặc định 0
              signedAt: new Date(),
              note: `Hợp đồng tự động tạo khi Admin ${auth.fullName} phê duyệt nhập kho xe ${generatedStockCode}`,
            },
          });

          // Ghi lịch sử và cập nhật trạng thái
          await tx.carOwnerHistory.create({
            data: {
              carId: createdCar.id,
              customerId: activity.customerId,
              type: "PURCHASE",
              contractNo: contractNo,
              price: contractData.price,
              date: new Date(),
            },
          });

          await tx.customer.update({
            where: { id: activity.customerId },
            data: { status: "DEAL_DONE" },
          });
          await tx.task.updateMany({
            where: { customerId: activity.customerId, status: "PENDING" },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          await tx.leadActivity.update({
            where: { id: activityId },
            data: {
              status: "DEAL_DONE",
              note: `✅ Nhập kho: ${generatedStockCode}`,
            },
          });

          return {
            type: "PURCHASE_DONE",
            stockCode: generatedStockCode,
            price: contractData.price,
            carName: carModelDb?.name,
          };
        }
        return { type: "UNKNOWN", price: 0 };
      },
      { timeout: 30000 },
    );

    // --- GỬI EMAIL THÔNG BÁO (NGOÀI TRANSACTION) ---
    if (activity.user?.email && result.type !== "UNKNOWN") {
      sendMail({
        to: activity.user.email,
        subject: `[KẾT QUẢ] Phê duyệt thu mua: ${activity.customer.fullName}`,
        html: purchaseResultEmailTemplate({
          staffName: activity.user.fullName || "Nhân viên",
          customerName: activity.customer.fullName,
          decision,
          reason,
          plateNumber: adminUpdatedData.licensePlate,
          carName: (result as any).carName || "Xe thu mua",
          price: Number(result.price),
        }),
      }).catch((err) => console.error("Mail Error:", err));
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/inventory");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("🔥 Error:", error);
    return { success: false, error: error.message };
  }
}
// 3. Cập nhật các trạng thái thông thường (Giữ nguyên)
export async function processLeadStatusUpdate(
  leadId: string,
  status: LeadStatus,
  reasonId: string,
  note: string,
) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  await db.customer.update({
    where: { id: leadId },
    data: {
      status,
      activities: {
        create: {
          status,
          reasonId: reasonId || null,
          note,
          createdById: auth.id,
        },
      },
    },
  });
  revalidatePath("/dashboard/assigned-tasks");
  return { success: true };
}

export async function getPendingApprovalsAction() {
  try {
    // 1. Lấy thông tin người dùng hiện tại
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // 2. Xác định phạm vi quyền hạn
    const isGlobalPower =
      currentUser.role === "ADMIN" || currentUser.isGlobalManager;

    // 3. Xây dựng điều kiện lọc
    const where: any = {
      status: { in: ["PENDING_DEAL_APPROVAL", "PENDING_LOSE_APPROVAL"] },
    };

    // Nếu không có quyền Global, chỉ lấy yêu cầu từ nhân viên trong cùng chi nhánh
    if (!isGlobalPower) {
      where.user = {
        branchId: currentUser.branchId,
      };
    }

    const approvals = await db.leadActivity.findMany({
      where,
      include: {
        customer: {
          include: {
            contracts: true,
            leadCar: true,
            carModel: true,
            // LẤY THÊM THÔNG TIN NGƯỜI GIÁM ĐỊNH
            inspectorRef: {
              select: {
                fullName: true,
                phone: true,
                role: true,
              },
            },
          },
        },
        user: {
          select: {
            fullName: true,
            branchId: true,
          },
        },
        reason: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Chuyển đổi Plain Object an toàn
    return JSON.parse(JSON.stringify(approvals));
  } catch (error) {
    console.error("Lỗi getPendingApprovalsAction:", error);
    return [];
  }
}

export async function requestSaleApproval(
  customerId: string,
  data: {
    carId: string;
    finalPrice: number;
    paymentMethod: string;
    contractNo: string;
    note: string;
    loyaltyNote: string;
  },
  taskId?: string,
) {
  try {
    // 0. Kiểm tra quyền truy cập
    const auth = await getCurrentUser();
    if (!auth)
      throw new Error("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.");

    const now = new Date();

    const result = await db.$transaction(
      async (tx) => {
        // 1. Lấy dữ liệu Khách hàng và Xe (khóa dòng để tránh race condition nếu cần)
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          include: { branch: true },
        });
        if (!customer)
          throw new Error("Khách hàng không tồn tại trên hệ thống.");

        const car = await tx.car.findUnique({
          where: { id: data.carId },
          select: { id: true, stockCode: true, modelName: true, status: true },
        });

        if (!car) throw new Error("Xe không tồn tại trong kho.");
        if (car.status === "SOLD")
          throw new Error("Xe này đã được bán cho khách hàng khác.");

        // Kiểm tra xem nhân viên hiện tại có phải người giới thiệu khách này không
        const isSelfReferral = customer.referrerId === auth.id;

        // 2. Xử lý Task chỉ định (Task trực tiếp dẫn đến việc chốt sale)
        if (taskId && taskId !== "none") {
          const mainTask = await tx.task.findUnique({
            where: { id: taskId },
          });

          if (mainTask && mainTask.status === "PENDING") {
            let isLate = false;
            let lateMinutes = 0;

            // Logic: Không tính trễ nếu tự giới thiệu, ngược lại so sánh deadline
            if (!isSelfReferral && now > mainTask.deadlineAt) {
              isLate = true;
              lateMinutes = Math.floor(
                (now.getTime() - mainTask.deadlineAt.getTime()) / (1000 * 60),
              );
            }

            await tx.task.update({
              where: { id: taskId },
              data: {
                status: "COMPLETED",
                completedAt: now,
                isLate: isLate,
                lateMinutes: lateMinutes,
                content: `Hoàn thành thông qua chốt bán HĐ: ${data.contractNo}`,
              },
            });
          }
        }

        // 3. XỬ LÝ ĐÓNG TẤT CẢ TASK ĐANG MỞ CỦA KHÁCH HÀNG NÀY
        // Tìm các task khác chưa hoàn thành
        const otherOpenTasks = await tx.task.findMany({
          where: {
            customerId: customerId,
            status: { in: ["PENDING"] },
            id: { not: taskId },
          },
        });

        if (otherOpenTasks.length > 0) {
          const closeTaskPromises = otherOpenTasks.map((t) => {
            let tIsLate = false;
            let tLateMinutes = 0;

            // Vẫn áp dụng logic: Không tính trễ nếu tự giới thiệu
            if (!isSelfReferral && now > t.deadlineAt) {
              tIsLate = true;
              tLateMinutes = Math.floor(
                (now.getTime() - t.deadlineAt.getTime()) / (1000 * 60),
              );
            }

            return tx.task.update({
              where: { id: t.id },
              data: {
                status: "CANCELLED",
                completedAt: now,
                isLate: tIsLate,
                lateMinutes: tLateMinutes,
                content: "Tự động đóng do khách hàng đã tiến hành chốt bán.",
              },
            });
          });
          await Promise.all(closeTaskPromises);
        }

        // 4. Cập nhật trạng thái khách hàng & Thông tin Deal (LeadCar)
        await tx.customer.update({
          where: { id: customerId },
          data: {
            status: "PENDING_DEAL_APPROVAL",
            leadCar: {
              upsert: {
                create: {
                  finalPrice: data.finalPrice,
                  note: `HĐ: ${data.contractNo} | HTTT: ${data.paymentMethod} | Ghi chú: ${data.note}`,
                  loyaltyNote: data.loyaltyNote,
                },
                update: {
                  finalPrice: data.finalPrice,
                  note: `HĐ: ${data.contractNo} | HTTT: ${data.paymentMethod} | Ghi chú: ${data.note}`,
                  loyaltyNote: data.loyaltyNote,
                },
              },
            },
          },
        });

        // 5. Khóa xe trong kho (BOOKED)
        await tx.car.update({
          where: { id: data.carId },
          data: {
            status: "BOOKED",
            contractNumber: data.contractNo,
          },
        });

        // 6. Ghi nhật ký hoạt động (Activity Log)
        const activityNote = `[YÊU CẦU CHỐT BÁN] HĐ: ${data.contractNo}. Xe: ${car.stockCode}. Giá: ${data.finalPrice.toLocaleString()}đ.${
          isSelfReferral ? " (Khách tự khai thác)" : ""
        }`;

        const activity = await tx.leadActivity.create({
          data: {
            customerId: customerId,
            status: "PENDING_DEAL_APPROVAL",
            note: activityNote,
            createdById: auth.id,
          },
        });

        return {
          activity,
          customerName: customer.fullName,
          branchId: customer.branchId,
          branchName: customer.branch?.name || "Hệ thống",
          carInfo: car,
        };
      },
      { timeout: 30000 }, // Tăng timeout cho các giao dịch phức tạp
    );

    // 7. Thông báo cho cấp quản lý (Background Task - Không đợi email gửi xong mới trả kết quả UI)
    const triggerEmails = async () => {
      try {
        const managers = await db.user.findMany({
          where: {
            active: true,
            OR: [
              { isGlobalManager: true },
              {
                role: { in: ["MANAGER"] },
                branchId: result.branchId,
              },
            ],
          },
          select: { email: true },
        });

        const emailList = managers.map((m) => m.email).filter(Boolean);
        if (emailList.length > 0) {
          await sendMail({
            to: emailList.join(","),
            subject: `[DUYỆT BÁN] HĐ ${data.contractNo} - Khách hàng: ${result.customerName.toUpperCase()}`,
            html: saleApprovalRequestEmailTemplate({
              staffName: auth.fullName || auth.username,
              customerName: result.customerName,
              carName: result.carInfo.modelName,
              stockCode: result.carInfo.stockCode,
              finalPrice: data.finalPrice,
              paymentMethod: data.paymentMethod,
              contractNo: data.contractNo,
              note: data.note,
              branchName: result.branchName,
            }),
          });
        }
      } catch (err) {
        console.error("Lỗi Background Email:", err);
      }
    };

    triggerEmails();

    // 8. Làm mới dữ liệu UI
    revalidatePath("/dashboard/sales-tasks");
    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/customers/${customerId}`);

    return {
      success: true,
      message: "Yêu cầu phê duyệt đã được gửi thành công.",
    };
  } catch (error: any) {
    console.error("Sale Approval Error:", error);
    return {
      success: false,
      error: error.message || "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.",
    };
  }
}
/**
 * 6. Gửi duyệt Dừng xử lý khách hàng (Lose/Frozen/Pending View)
 * Luồng đi:
 * - Đóng Task hiện tại (PENDING -> CANCELLED/COMPLETED)
 * - Chuyển Customer sang trạng thái chờ duyệt (PENDING_LOSE_APPROVAL)
 * - Tạo bản ghi Activity để Admin có dữ liệu phê duyệt
 */

export async function requestLoseApproval(
  customerId: string,
  reasonId: string,
  note: string,
  targetStatus: LeadStatus,
) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  try {
    // 1. LẤY THÔNG TIN CHI TIẾT (Để phục vụ gửi mail và kiểm tra điều kiện)
    const [customer, reason] = await Promise.all([
      db.customer.findUnique({
        where: { id: customerId },
        include: { branch: true },
      }),
      db.leadReason.findUnique({
        where: { id: reasonId },
        select: { content: true },
      }),
    ]);

    if (!customer) throw new Error("Khách hàng không tồn tại");

    // Chặn gửi trùng yêu cầu
    if (
      ["PENDING_LOSE_APPROVAL", "PENDING_DEAL_APPROVAL"].includes(
        customer.status,
      )
    ) {
      return {
        success: false,
        error:
          "Hồ sơ này đang trong trạng thái chờ duyệt, vui lòng không gửi lại.",
      };
    }

    // 2. THỰC HIỆN TRONG TRANSACTION
    const result = await db.$transaction(
      async (tx) => {
        const now = new Date();

        // Kiểm tra Task trễ hạn trước khi đóng
        const lateTask = await tx.task.findFirst({
          where: {
            assigneeId: auth.id,
            customerId: customerId,
            status: "PENDING",
            deadlineAt: { lt: now },
          },
          orderBy: { deadlineAt: "asc" },
        });

        const isLate = !!lateTask;
        const lateMinutes = lateTask
          ? dayjs(now).diff(lateTask.deadlineAt, "minute")
          : 0;

        // A. Đóng tất cả task đang mở của hồ sơ này
        await tx.task.updateMany({
          where: {
            assigneeId: auth.id,
            customerId: customerId,
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
            completedAt: now,
            isLate,
            lateMinutes,
          },
        });

        // B. Cập nhật trạng thái khách hàng sang Chờ duyệt hủy
        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: { status: "PENDING_LOSE_APPROVAL" },
        });

        // C. Tạo Nhật ký phê duyệt (Snap-shot dữ liệu tại thời điểm gửi)
        const activity = await tx.leadActivity.create({
          data: {
            customerId,
            status: "PENDING_LOSE_APPROVAL",
            reasonId,
            note: `[YÊU CẦU DUYỆT DỪNG - ĐÍCH: ${targetStatus}]: ${note}`,
            createdById: auth.id,
            isLate,
            lateMinutes,
          },
        });

        return { updatedCustomer, activity };
      },
      { timeout: 20000 },
    );

    // 3. GỬI THÔNG BÁO EMAIL (Chạy Background - Không đợi mail xong mới trả kết quả)
    (async () => {
      try {
        const managers = await db.user.findMany({
          where: {
            active: true,
            OR: [
              { isGlobalManager: true },
              { role: "MANAGER", branchId: customer.branchId },
            ],
          },
          select: { email: true },
        });

        const managerEmails = managers.map((m) => m.email).filter(Boolean);

        if (managerEmails.length > 0) {
          await sendMail({
            to: managerEmails.join(","),
            subject: `[YÊU CẦU DUYỆT ĐÓNG] Khách hàng: ${customer.fullName.toUpperCase()}`,
            html: loseApprovalRequestEmailTemplate({
              staffName: auth.fullName || auth.username,
              customerName: customer.fullName,
              customerPhone: customer.phone,
              reason: reason?.content || "Không rõ lý do",
              note: note,
              targetStatus: targetStatus,
              branchName: customer.branch?.name || "Hệ thống",
            }),
          });
        }
      } catch (err) {
        console.error("Lỗi gửi mail thông báo duyệt hủy:", err);
      }
    })();

    // 4. LÀM MỚI DỮ LIỆU UI
    revalidatePath("/dashboard/assigned-tasks");
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/leads");

    return { success: true };
  } catch (error: any) {
    console.error("Lose Request Error:", error);
    return {
      success: false,
      error: error.message || "Lỗi hệ thống khi xử lý yêu cầu",
    };
  }
}

// 7. Lấy danh sách xe sẵn sàng (Giữ nguyên)
export async function getAvailableCars() {
  try {
    const cars = await db.car.findMany({
      where: {
        status: {
          in: [
            CarStatus.READY_FOR_SALE,
            CarStatus.REFURBISHING,
            CarStatus.BOOKED,
            CarStatus.NEW,
            CarStatus.PENDING,
          ],
        },
      },
      select: {
        id: true,
        modelName: true,
        licensePlate: true,
        sellingPrice: true, // Trường Decimal
        stockCode: true,
        year: true,
        vin: true,
        color: true,
        carModelId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Chuyển đổi Decimal sang Number thủ công để đảm bảo Client nhận đúng kiểu số
    const serializedCars = cars.map((car) => ({
      ...car,
      sellingPrice: car.sellingPrice ? Number(car.sellingPrice) : 0,
    }));

    // Một lần nữa dùng JSON parse/stringify để dọn dẹp các trường Date (nếu có)
    return JSON.parse(JSON.stringify(serializedCars));
  } catch (error) {
    console.error("❌ Error fetching available cars:", error);
    return [];
  }
}

export async function updateCustomerStatusAction(
  customerId: string,
  status: LeadStatus,
  note: string,
  currentTaskId?: string,
  nextContactAtStr?: string | null,
  payload?: {
    nextNote?: string;
    reasonId?: string;
  },
  urgencyLevel?: UrgencyType,
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date();
    const nextContactAt = nextContactAtStr ? new Date(nextContactAtStr) : null;

    const result = await db.$transaction(
      async (tx) => {
        const [config, customer] = await Promise.all([
          tx.leadSetting.findFirst(),
          tx.customer.findUnique({ where: { id: customerId } }),
        ]);

        if (!customer) throw new Error("Customer not found");

        const maxLateMinutes = config?.maxLateMinutes || 30;
        let isLate = false;
        let lateMinutes = 0;

        // 1. TÌM TASK CHÍNH (Task hiện tại đang được xử lý để tính toán trễ hạn)
        const currentTask = currentTaskId
          ? await tx.task.findUnique({ where: { id: currentTaskId } })
          : await tx.task.findFirst({
              where: { customerId, status: "PENDING" },
              orderBy: { scheduledAt: "asc" },
            });

        // 2. TÍNH TOÁN TRỄ HẠN (Dựa trên task cũ nhất hoặc task được chọn)
        if (currentTask && currentTask.status === "PENDING") {
          const isSelfReferral = customer.referrerId === customer.assignedToId;
          if (!isSelfReferral) {
            const deadline = dayjs(currentTask.scheduledAt).add(
              maxLateMinutes,
              "minute",
            );
            isLate = dayjs(now).isAfter(deadline);
            lateMinutes = isLate ? dayjs(now).diff(deadline, "minute") : 0;
          }
        }

        // 3. ĐÓNG TẤT CẢ CÁC TASK ĐANG PENDING CỦA KHÁCH HÀNG NÀY
        // Thay vì chỉ update 1 cái, ta quét sạch để tránh rác dữ liệu
        await tx.task.updateMany({
          where: {
            customerId: customerId,
            status: "PENDING",
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
            content: `[Hệ thống tự động đóng] ${note}`,
          },
        });

        // Nếu có task cụ thể được xử lý, cập nhật chính xác task đó với thông tin trễ hạn
        if (currentTask) {
          await tx.task.update({
            where: { id: currentTask.id },
            data: {
              content: note,
              isLate,
              lateMinutes,
            },
          });
        }

        const operations = [];

        // 4. CẬP NHẬT THÔNG TIN KHÁCH HÀNG
        operations.push(
          tx.customer.update({
            where: { id: customerId },
            data: {
              status,
              lastContactAt: now,
              firstContactAt: customer.firstContactAt ? undefined : now,
              nextContactAt: nextContactAt,
              nextContactNote: payload?.nextNote || null,
              lastContactResult: note || null,
              contactCount: { increment: 1 },
              urgencyLevel: urgencyLevel,
            },
          }),
        );

        // 5. TẠO TASK MỚI (NẾU CÓ HẸN)
        if (nextContactAt) {
          const taskType =
            currentTask?.type === "MAINTENANCE" || status === "DEAL_DONE"
              ? "MAINTENANCE"
              : customer.type === "BUY"
                ? "SALES"
                : "PURCHASE";

          operations.push(
            tx.task.create({
              data: {
                title: `Gọi lại: ${customer.fullName}`,
                content: payload?.nextNote || "Chăm sóc khách hàng",
                scheduledAt: nextContactAt,
                deadlineAt: dayjs(nextContactAt)
                  .add(maxLateMinutes, "minute")
                  .toDate(),
                type: taskType,
                assigneeId: user.id,
                customerId: customerId,
                status: "PENDING",
              },
            }),
          );
        }

        // 6. GHI LOG HOẠT ĐỘNG
        operations.push(
          tx.leadActivity.create({
            data: {
              customerId,
              status,
              note: isLate ? `[TRỄ ${lateMinutes}m] ${note}` : note,
              createdById: user.id,
              reasonId: payload?.reasonId || null,
              isLate,
              lateMinutes,
            },
          }),
        );

        await Promise.all(operations);
        return { success: true, isLate, lateMinutes };
      },
      { timeout: 20000 },
    );
    if (result.success) {
      const customerDetail = await db.customer.findUnique({
        where: { id: customerId },
        include: { referrer: true, assignedTo: true },
      });

      if (customerDetail) {
        const emailData = {
          staffName: customerDetail.assignedTo?.fullName || "N/A",
          referrerName: customerDetail.referrer.fullName || "N/A",
          customerName: customerDetail.fullName,
          status: status,
          note: note,
          nextContactAt: nextContactAt
            ? dayjs(nextContactAt).format("HH:mm DD/MM/YYYY")
            : undefined,
          nextNote: payload?.nextNote,
        };

        // Gửi cho Sale xử lý
        // await sendMail({
        //   to: customerDetail.assignedTo?.email ?? "",
        //   subject: `[CRM] Tương tác khách hàng: ${customerDetail.fullName}`,
        //   html: contactActivityEmailTemplate({
        //     ...emailData,
        //     isReferrer: false,
        //   }),
        // });

        // Gửi cho Người giới thiệu (Nếu người giới thiệu không phải là chính người xử lý)
        if (customerDetail.referrerId !== customerDetail.assignedToId) {
          await sendMail({
            to: customerDetail.referrer.email,
            subject: `[CRM] Cập nhật tiến độ:`,
            html: contactActivityEmailTemplate({
              ...emailData,
              isReferrer: true,
            }),
          });
        }
      }
    }
    // 5. Đưa revalidatePath RA NGOÀI Transaction
    revalidatePath("/dashboard/assigned-tasks");

    return serializePrisma(result);
  } catch (error: any) {
    console.error("🔥 Error in updateCustomerStatusAction:", error);
    return { success: false, error: error.message };
  }
}

//Tạo khách hàng mới và gán trực tiếp cho nhân

export async function selfCreateCustomerAction(values: any) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  try {
    // 1. CHUẨN HÓA DỮ LIỆU ĐỊNH DANH
    const cleanPlate = values.licensePlate
      ? values.licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, "")
      : undefined;

    const activeStatuses = {
      notIn: [LeadStatus.DEAL_DONE, LeadStatus.CANCELLED, LeadStatus.LOSE],
    };

    // 2. KIỂM TRA TRÙNG LẶP (Giữ nguyên logic của bạn)
    if (values.type === "BUY") {
      const duplicatePhone = await db.customer.findFirst({
        where: { phone: values.phone, type: "BUY", status: activeStatuses },
      });
      if (duplicatePhone)
        return {
          success: false,
          error: `SĐT ${values.phone} đang có yêu cầu MUA XE.`,
        };
    } else if (cleanPlate) {
      const duplicatePlate = await db.customer.findFirst({
        where: { licensePlate: cleanPlate, status: activeStatuses },
      });
      if (duplicatePlate)
        return {
          success: false,
          error: `Biển số ${cleanPlate} đang được xử lý.`,
        };
    }

    let inventoryCarData: any = null;
    if (values.inventoryCarId) {
      inventoryCarData = await db.car.findUnique({
        where: { id: values.inventoryCarId },
      });
    }

    // 3. TRANSACTION LƯU DỮ LIỆU
    const result = await db.$transaction(async (tx) => {
      const now = new Date();

      // ÉP KIỂU SỐ THÀNH CHUỖI ĐỂ TRÁNH LỖI PRISMA
      const finalExpectedPrice =
        values.expectedPrice !== undefined && values.expectedPrice !== null
          ? String(values.expectedPrice)
          : null;

      const finalBudget =
        values.budget !== undefined && values.budget !== null
          ? String(values.budget)
          : null;

      const customer = await tx.customer.create({
        data: {
          fullName: values.fullName,
          phone: values.phone,
          status: LeadStatus.CONTACTED,
          type: values.type,
          referrerId: auth.id,
          assignedToId: auth.id,
          assignedAt: now,
          branchId: auth.branchId,
          carModelId: inventoryCarData
            ? inventoryCarData.carModelId
            : values.carModelId,

          // LƯU TRƯỜNG XE MUỐN ĐỔI (TRADE-IN)
          tradeInModelId: values.tradeInModelId || null,
          source: values.source,

          licensePlate: inventoryCarData
            ? inventoryCarData.licensePlate
            : cleanPlate,
          budget: finalBudget, // Đã ép kiểu sang String
          expectedPrice: finalExpectedPrice, // Đã ép kiểu sang String
          note: values.note,

          leadCar: {
            create: {
              carModelId: inventoryCarData
                ? inventoryCarData.carModelId
                : values.carModelId,
              modelName: inventoryCarData
                ? inventoryCarData.modelName
                : undefined,
              licensePlate: inventoryCarData
                ? inventoryCarData.licensePlate
                : cleanPlate,
              year: inventoryCarData
                ? inventoryCarData.year
                : values.carYear
                  ? parseInt(values.carYear)
                  : undefined,
              vin: inventoryCarData ? inventoryCarData.vin : undefined,
              engineNumber: inventoryCarData
                ? inventoryCarData.engineNumber
                : undefined,
              odo: inventoryCarData
                ? inventoryCarData.odo
                  ? Number(inventoryCarData.odo)
                  : undefined
                : values.odo
                  ? Number(values.odo)
                  : undefined,
              color: inventoryCarData ? inventoryCarData.color : values.color,
              // Lưu ý: tSurePrice và expectedPrice trong LeadCar thường là Decimal, Prisma nhận Number/String đều được nhưng nên đồng nhất
              tSurePrice: inventoryCarData
                ? inventoryCarData.costPrice
                : undefined,
              expectedPrice: inventoryCarData
                ? inventoryCarData.sellingPrice
                : finalExpectedPrice,
              note: inventoryCarData
                ? `Xe chọn từ kho: ${inventoryCarData.stockCode}`
                : undefined,
            },
          },

          tasks: {
            create: {
              title: `🌟 CHĂM SÓC: ${values.fullName}`,
              content: inventoryCarData
                ? `Khách quan tâm xe kho: ${inventoryCarData.stockCode}. ${values.note || ""}`
                : `Khách tự khai thác - ${values.note || "Nghiệp vụ " + values.type}`,
              scheduledAt: now,
              deadlineAt: dayjs(now).add(10, "year").toDate(),
              assigneeId: auth.id,
              status: TaskStatus.PENDING,
              type: values.type === "BUY" ? "SALES" : "PURCHASE",
            },
          },

          activities: {
            create: {
              status: LeadStatus.CONTACTED,
              note: `[NHÂN VIÊN TỰ TẠO] Khách hàng quan tâm ${inventoryCarData ? "xe tại kho" : "xe ngoài"}.`,
              createdById: auth.id,
            },
          },
        },
      });

      await tx.user.update({
        where: { id: auth.id },
        data: { lastAssignedAt: now },
      });

      revalidatePath("/dashboard/assigned-tasks");
      revalidatePath("/dashboard/my-referrals");

      return { success: true, data: JSON.parse(JSON.stringify(customer)) };
    });
    if (result.success) {
      // Lấy thêm thông tin chi nhánh và danh sách quản lý để gửi mail
      const branchManagers = await db.user.findMany({
        where: {
          branchId: auth.branchId,
          role: { in: ["MANAGER"] }, // Các role quản lý của chi nhánh
          active: true,
        },
        select: { email: true },
      });

      // Lấy thêm email Admin tổng (nếu có role ADMIN)
      const admins = await db.user.findMany({
        where: { role: "ADMIN", active: true },
        select: { email: true },
      });

      const allRecipients = [
        ...branchManagers.map((m) => m.email),
        ...admins.map((a) => a.email),
      ].filter(Boolean);

      if (allRecipients.length > 0) {
        // Chuẩn bị thông tin xe
        const carInfo = inventoryCarData
          ? `Xe kho: ${inventoryCarData.stockCode} (${inventoryCarData.modelName})`
          : values.carModelName || "Xe ngoài hệ thống";
        const branch = auth.branchId
          ? await db.branch.findUnique({
              where: { id: auth.branchId },
              select: { name: true },
            })
          : null;
        const emailHtml = selfCreatedLeadEmailTemplate({
          staffName: auth.fullName || auth.username,
          branchName: branch?.name || "Chi nhánh hiện tại",
          customerName: values.fullName,
          customerPhone: values.phone,
          customerType: values.type,
          carInfo: carInfo,
          note: values.note,
        });

        // Gửi mail (Sử dụng hàm gửi mail của bạn - ví dụ resend hoặc nodemailer)
        await sendMail({
          to: allRecipients,
          subject: `[HỆ THỐNG] Nhân viên tự tạo khách hàng mới`,
          html: emailHtml,
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error("Lỗi selfCreateCustomerAction:", error);
    return { success: false, error: error.message || "Lỗi hệ thống" };
  }
}
export async function approveLoseRequestAction(
  activityId: string,
  decision: "APPROVE" | "REJECT",
  targetStatus?: string,
  note?: string,
) {
  const auth = await getCurrentUser();
  if (!auth || (auth.role !== "ADMIN" && auth.role !== "MANAGER")) {
    throw new Error("Bạn không có quyền thực hiện thao tác này");
  }

  try {
    // 1. Lấy thông tin Activity và nhân viên đề xuất
    const activity = await db.leadActivity.findUnique({
      where: { id: activityId },
      include: {
        customer: {
          include: {
            assignedTo: {
              // Lấy thông tin Sale đang chăm sóc trực tiếp
              select: { email: true, fullName: true },
            },
            referrer: {
              select: { email: true, fullName: true },
            },
          },
        },
        reason: true,
        user: {
          // Nhân viên đề xuất (người nhận mail)
          select: { email: true, fullName: true, username: true },
        },
      },
    });

    if (!activity) throw new Error("Không tìm thấy yêu cầu phê duyệt");

    const result = await db.$transaction(
      async (tx) => {
        const customerId = activity.customerId;
        const finalStatus = (targetStatus as LeadStatus) || LeadStatus.LOSE;

        if (decision === "APPROVE") {
          // --- ĐỒNG Ý CHO DỪNG ---
          await tx.customer.update({
            where: { id: customerId },
            data: {
              status: finalStatus,
              note: activity.note
                ? `${activity.customer.note}\n[ADMIN DUYỆT ĐÓNG]: ${activity.note} -- Lý do: ${note}`
                : activity.customer.note,
              lastFrozenAt:
                finalStatus === LeadStatus.FROZEN ? new Date() : null,
            },
          });

          await tx.leadActivity.create({
            data: {
              customerId: customerId,
              status: finalStatus,
              reasonId: activity.reasonId,
              note: `✅ Admin [${auth.fullName}] đã phê duyệt đóng hồ sơ. -- Lý do: ${note}`,
              createdById: auth.id,
            },
          });
        } else {
          // --- TỪ CHỐI (BẮT LÀM TIẾP) ---
          const taskType =
            activity.customer.type === "BUY" ? "SALES" : "PURCHASE";

          await tx.customer.update({
            where: { id: customerId },
            data: { status: LeadStatus.CONTACTED },
          });

          await tx.task.create({
            data: {
              title: "⚠️ TIẾP TỤC CHĂM SÓC: " + activity.customer.fullName,
              content: `Admin từ chối yêu cầu dừng hồ sơ. Lý do: ${note}. `,
              assigneeId: activity.createdById,
              customerId: customerId,
              type: taskType,
              scheduledAt: new Date(),
              deadlineAt: dayjs().add(4, "hour").toDate(),
              status: TaskStatus.PENDING,
            },
          });

          await tx.leadActivity.create({
            data: {
              customerId: customerId,
              status: LeadStatus.REJECTED_APPROVAL,
              reasonId: activity.reasonId,
              note: `❌ Admin [${auth.fullName}] từ chối yêu cầu đóng hồ sơ. Yêu cầu làm tiếp. Lý do: ${note}`,
              createdById: auth.id,
            },
          });
        }

        // Cập nhật Activity yêu cầu ban đầu là đã xử lý
        await tx.leadActivity.update({
          where: { id: activityId },
          data: {
            status:
              decision === "APPROVE"
                ? LeadStatus.DEAL_DONE
                : LeadStatus.REJECTED_APPROVAL,
          },
        });

        return { success: true };
      },
      { timeout: 15000 },
    );
    const emailsToSend = [];

    // Mail cho nhân viên đang chăm sóc (Assignee)
    // Mail cho nhân viên đang chăm sóc (Sale)
    const saleStaff = activity.customer.assignedTo;
    if (saleStaff?.email) {
      emailsToSend.push(
        sendMail({
          to: saleStaff.email,
          subject: `[KẾT QUẢ] Duyệt dừng hồ sơ khách hàng: ${activity.customer.fullName.toUpperCase()}`,
          html: staffLoseResultEmailTemplate({
            staffName: saleStaff.fullName || "Chuyên viên tư vấn",
            customerName: activity.customer.fullName,
            decision: decision,
            targetStatus: targetStatus,
            adminNote: note ?? "", // Ghi chú từ người duyệt
          }),
        }),
      );
    }

    if (activity.customer.referrer?.email) {
      emailsToSend.push(
        sendMail({
          to: activity.customer.referrer.email,
          subject: `[TOYOTA BÌNH DƯƠNG] Cập nhật hồ sơ khách hàng: ${activity.customer.fullName.toUpperCase()}`,
          html: referrerLoseResultEmailTemplate({
            referrerName: activity.customer.referrer.fullName || "Quý đối tác",
            customerName: activity.customer.fullName,
            decision: decision,
            targetStatus: targetStatus,
            carInfo: activity.customer.carYear
              ? `${activity.customer.carYear}`
              : undefined,
            reason: `${activity.reason?.content} | ${activity.note} `,
          }),
        }),
      );
    }
    if (emailsToSend.length > 0) {
      Promise.allSettled(emailsToSend).catch((e) =>
        console.error("Lỗi gửi mail tổng:", e),
      );
    }
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/assigned-tasks");
    revalidatePath("/dashboard/frozen-leads");

    return { success: true };
  } catch (error: any) {
    console.error("Approve Lose Request Error:", error);
    return { success: false, error: error.message };
  }
}

// làm chức năng rã băng
export async function unfreezeCustomerAction(
  customerId: string,
  assigneeId: string,
  note: string,
) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Lấy thông tin khách hàng và chi tiết nhân viên mới
      const currentCustomer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { branch: true },
      });

      if (!currentCustomer || currentCustomer.status !== "FROZEN") {
        throw new Error(
          "Hồ sơ này đã được rã băng hoặc không còn ở trạng thái đóng băng.",
        );
      }

      const assignee = await tx.user.findUnique({
        where: { id: assigneeId },
        select: { email: true, fullName: true, username: true },
      });

      if (!assignee) throw new Error("Không tìm thấy nhân viên tiếp quản.");

      const now = new Date();

      // 2. Cập nhật Customer
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          status: "FOLLOW_UP",
          assignedToId: assigneeId,
          assignedAt: now,
        },
      });

      // 3. Xác định loại nhiệm vụ
      const taskType = currentCustomer.type === "BUY" ? "SALES" : "PURCHASE";
      const typeLabel =
        currentCustomer.type === "BUY" ? "MUA XE" : "THU MUA / ĐỊNH GIÁ";

      // 4. Tạo Task mới
      await tx.task.create({
        data: {
          title: `❄️ RÃ BĂNG: Tiếp tục chăm sóc ${updatedCustomer.fullName}`,
          content: `Lý do rã băng: ${note}`,
          customerId: customerId,
          assigneeId: assigneeId,
          type: taskType,
          scheduledAt: now,
          deadlineAt: dayjs(now).add(2, "hour").toDate(),
          status: "PENDING",
        },
      });

      // 5. Ghi nhật ký hoạt động
      await tx.leadActivity.create({
        data: {
          customerId: customerId,
          status: "FOLLOW_UP",
          note: `[RÃ BĂNG] - Quản lý ${auth.fullName} đã rã băng và giao cho nhân viên tiếp quản. Ghi chú: ${note}`,
          createdById: auth.id,
        },
      });

      return {
        success: true,
        assignee,
        customerName: updatedCustomer.fullName,
        customerPhone: updatedCustomer.phone,
        branchName: currentCustomer.branch?.name,
        typeLabel,
      };
    });

    // 6. GỬI MAIL THÔNG BÁO CHO NHÂN VIÊN ĐƯỢC CHỌN (Background)
    if (result.assignee.email) {
      (async () => {
        try {
          await sendMail({
            to: result.assignee.email,
            subject: `[NHIỆM VỤ RÃ BĂNG] Chăm sóc khách hàng: ${result.customerName.toUpperCase()}`,
            html: unfreezeAssignmentEmailTemplate({
              staffName: result.assignee.fullName || result.assignee.username,
              customerName: result.customerName,
              customerPhone: result.customerPhone,
              unfreezeNote: note,
              typeLabel: result.typeLabel,
              branchName: result.branchName || "Chi nhánh gốc",
            }),
          });
        } catch (mailErr) {
          console.error("Lỗi gửi mail rã băng:", mailErr);
        }
      })();
    }

    revalidatePath("/dashboard/frozen-leads");
    revalidatePath("/dashboard/assigned-tasks");

    return { success: true };
  } catch (error: any) {
    console.error("Unfreeze Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * PHÊ DUYỆT CHỐT BÁN XE (Luồng Hợp đồng + Gửi mail Staff & Referrer)
 */
export async function approveDealAction(
  activityId: string,
  decision: "APPROVE" | "REJECT",
  adminNote: string,
  contractNo?: string,
) {
  try {
    const auth = await getCurrentUser();
    if (
      !auth ||
      (auth.role !== "MANAGER" &&
        !auth.isGlobalManager &&
        auth.role !== "ADMIN")
    ) {
      throw new Error("Bạn không có quyền thực hiện phê duyệt này.");
    }

    // 1. Lấy dữ liệu hồ sơ bao gồm cả Người giới thiệu (Referrer)
    const activity = await db.leadActivity.findUnique({
      where: { id: activityId },
      include: {
        customer: {
          include: {
            leadCar: true,
            referrer: { select: { email: true, fullName: true } }, // Lấy thông tin người giới thiệu
          },
        },
        user: { select: { email: true, fullName: true, id: true } }, // Đây là nhân viên (Staff)
      },
    });

    if (!activity) throw new Error("Không tìm thấy yêu cầu phê duyệt.");

    const customerId = activity.customerId;
    let emailData: any = null;

    // 2. Chạy Transaction xử lý Database
    await db.$transaction(
      async (tx) => {
        const linkedCar = await tx.car.findFirst({
          where: {
            status: "BOOKED",
            contractNumber: contractNo,
          },
        });

        if (!linkedCar) {
          throw new Error(
            `Không tìm thấy xe đang đặt cọc với số HĐ: ${contractNo}`,
          );
        }

        if (decision === "REJECT") {
          // --- LUỒNG TỪ CHỐI ---
          await tx.customer.update({
            where: { id: customerId },
            data: { status: "FOLLOW_UP" },
          });

          await tx.car.update({
            where: { id: linkedCar.id },
            data: { status: "READY_FOR_SALE", contractNumber: null },
          });

          await tx.task.create({
            data: {
              title: "⚠️ SỬA HỒ SƠ BÁN XE BỊ TỪ CHỐI",
              content: `Lý do: ${adminNote}.`,
              type: "SALES",
              status: "PENDING",
              customerId,
              assigneeId: activity.createdById,
              scheduledAt: new Date(),
              deadlineAt: dayjs().add(2, "hour").toDate(),
            },
          });

          await tx.leadActivity.update({
            where: { id: activityId },
            data: {
              status: "REJECTED_APPROVAL",
              note: `❌ [TỪ CHỐI]: ${adminNote}`,
            },
          });
        } else {
          // --- LUỒNG PHÊ DUYỆT ---
          if (!contractNo) throw new Error("Thiếu số hợp đồng.");

          await tx.customer.update({
            where: { id: customerId },
            data: { status: "INSPECTING" },
          });

          await tx.contract.create({
            data: {
              contractNumber: contractNo,
              type: "SALE",
              status: "SIGNED",
              customerId: customerId,
              carId: linkedCar.id,
              staffId: activity.createdById,
              totalAmount: activity.customer?.leadCar?.finalPrice || 0,
              depositAmount: activity.customer?.leadCar?.expectedPrice || 0,
              signedAt: new Date(),
              note: adminNote,
            },
          });

          await tx.car.update({
            where: { id: linkedCar.id },
            data: { contractNumber: contractNo },
          });

          await tx.leadActivity.update({
            where: { id: activityId },
            data: {
              status: "DEAL_DONE",
              note: `✅ [PHÊ DUYỆT]: Đã tạo hợp đồng số ${contractNo}.`,
            },
          });
        }

        // Chuẩn bị danh sách email nhận thông báo
        emailData = {
          carName: linkedCar.modelName,
          customerName: activity.customer?.fullName,
          staffEmail: activity.user?.email,
          staffName: activity.user?.fullName,
          referrerEmail: activity.customer?.referrer?.email, // Email người giới thiệu
          referrerName: activity.customer?.referrer?.fullName,
        };
      },
      { timeout: 30000 },
    );

    // 3. Gửi Mail cho cả Nhân viên và Người giới thiệu (Ngoài transaction)
    const mailContent = dealResultEmailTemplate({
      staffName: emailData.staffName,
      customerName: emailData.customerName,
      decision,
      adminNote,
      contractNo,
      carName: emailData.carName,
    });

    const recipients = [];
    if (emailData.staffEmail) recipients.push(emailData.staffEmail);
    if (emailData.referrerEmail) recipients.push(emailData.referrerEmail);

    if (recipients.length > 0) {
      const subject =
        decision === "APPROVE"
          ? `🎉 [THÀNH CÔNG] Phê duyệt bán xe: ${emailData.customerName}`
          : `⚠️ [THÔNG BÁO] Kết quả phê duyệt hồ sơ: ${emailData.customerName}`;

      // Gửi mail song song cho tất cả người nhận
      await Promise.all(
        recipients.map((email) =>
          sendMail({
            to: email,
            subject: subject,
            html: mailContent,
          }).catch((err) => console.error(`Lỗi gửi mail đến ${email}:`, err)),
        ),
      );
    }

    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/contracts");

    return { success: true };
  } catch (error: any) {
    console.error("🔥 Error in approveDealAction:", error);
    return { success: false, error: error.message };
  }
}
// actions/task-actions.ts
export async function getMaintenanceTasksAction() {
  const auth = await getCurrentUser();
  if (!auth) return { success: false, error: "Unauthorized" };
  return await db.task.findMany({
    where: {
      assigneeId: auth.id,
      status: "PENDING",
      type: "MAINTENANCE",
      title: { contains: "BẢO DƯỠNG" }, // Lọc theo từ khóa chúng ta đã set lúc Approve
    },
    include: { customer: true },
    orderBy: { deadlineAt: "asc" },
  });
}

export async function completeMaintenanceTaskAction(taskId: string) {
  const now = new Date();
  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task) return { success: false };

  // Tính KPI trễ phút nếu cần
  const isLate = now > task.deadlineAt;
  const lateMinutes = isLate
    ? Math.floor((now.getTime() - task.deadlineAt.getTime()) / 60000)
    : 0;

  await db.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedAt: now,
      isLate: isLate,
      lateMinutes: lateMinutes,
    },
  });
  return { success: true };
}

export async function getCustomerUrgencyStatsAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Định nghĩa các trạng thái khách hàng đang hoạt động (giống với list của bạn)
  const activeStatuses: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "FOLLOW_UP",
    "INSPECTING",
    "ASSIGNED",
    "PENDING_DEAL_APPROVAL",
    "PENDING_LOSE_APPROVAL",
  ];

  const stats = await db.customer.groupBy({
    by: ["urgencyLevel"],
    where: {
      assignedToId: user.id,
      status: {
        in: activeStatuses,
      },
    },
    _count: {
      urgencyLevel: true,
    },
  });

  // Chuyển đổi kết quả sang định dạng dễ dùng hơn
  const result = {
    HOT: 0,
    WARM: 0,
    COOL: 0,
    UNASSIGNED: 0, // Trường hợp urgencyLevel bị null
  };

  stats.forEach((item) => {
    if (item.urgencyLevel) {
      result[item.urgencyLevel] = item._count.urgencyLevel;
    } else {
      result.UNASSIGNED = item._count.urgencyLevel;
    }
  });

  return result;
}

export async function getMyCustomersAction(filters?: any) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const whereCondition: any = {
    assignedToId: user.id,
    status: {
      in: ["NEW", "CONTACTED", "FOLLOW_UP", "INSPECTING", "ASSIGNED"],
    },
  };

  if (filters) {
    if (filters.urgencyLevel && filters.urgencyLevel !== "ALL") {
      if (filters.urgencyLevel === "UNDERFINE") {
        console.log(filters.urgencyLevel);

        // Nếu chọn "Chưa xác định", tìm các bản ghi có urgencyLevel là null
        whereCondition.urgencyLevel = null;
      } else {
        // Ngược lại thì lọc theo giá trị cụ thể (HIGH, MEDIUM, LOW...)
        whereCondition.urgencyLevel = filters.urgencyLevel;
      }
    }
    // Lọc Tên/SĐT
    if (filters.searchText) {
      whereCondition.OR = [
        { fullName: { contains: filters.searchText } },
        { phone: { contains: filters.searchText } },
        // THÊM DÒNG NÀY: Search theo tên model xe
        {
          carModel: {
            name: { contains: filters.searchText },
          },
        },
      ];
    }
    // Lọc Biển số
    if (filters.licensePlate) {
      whereCondition.leadCar = {
        licensePlate: { contains: filters.licensePlate },
      };
    }
    // Lọc Trạng thái xem xe
    if (filters.inspectStatus && filters.inspectStatus !== "ALL") {
      whereCondition.inspectStatus = filters.inspectStatus;
    }
    // Lọc ngày nhận
    if (filters.dateRange && filters.dateRange.length === 2) {
      whereCondition.createdAt = {
        gte: dayjs(filters.dateRange[0]).startOf("day").toDate(),
        lte: dayjs(filters.dateRange[1]).endOf("day").toDate(),
      };
    }
  }

  const customers = await db.customer.findMany({
    where: whereCondition,
    include: {
      carModel: { select: { name: true } },
      leadCar: true,
      branch: { select: { name: true } },
      activities: {
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return serializePrisma(customers);
}

export async function getAllStaffAPPRAISERAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return await db.user.findMany({
    where: { active: true, role: Role.APPRAISER },
    select: { id: true, fullName: true, username: true },
  });
}

// 2. Lấy danh mục lý do bán xe
export async function getSellReasonsAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return await db.sellReason.findMany({
    orderBy: { name: "asc" },
  });
}

// 3. Lấy danh mục lý do chưa xem xe
export async function getNotSeenReasonsAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return await db.notSeenCarModel.findMany({
    orderBy: { name: "asc" },
  });
}
