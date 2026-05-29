/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  lateLeadRecallEmailTemplate,
  overdueCustomerReminderEmailTemplate,
  referralEmailTemplate,
  referrerConfirmationEmailTemplate,
  staffAssignmentEmailTemplate,
} from "@/lib/mail-templates";
import { sendMail } from "@/lib/mail-service";
import { LeadStatus, Prisma, TaskStatus, UrgencyType } from "@prisma/client";
import { getCurrentUser } from "@/lib/session-server";
import dayjs from "@/lib/dayjs";
import { getReferralTypeLabel } from "@/lib/utils";
const calculateDeadline = (startTime: Date, maxLateMinutes: number) => {
  // Chuyển đổi sang múi giờ VN
  const vnTime = dayjs(startTime).tz("Asia/Ho_Chi_Minh");

  const hour = vnTime.hour();
  const minute = vnTime.minute();

  // Kiểm tra nếu sau 16:30
  if (hour > 16 || (hour === 16 && minute >= 30)) {
    // Trả về 08:30 sáng ngày hôm sau (vẫn giữ múi giờ VN)
    return vnTime
      .add(1, "day")
      .set("hour", 8)
      .set("minute", 30)
      .set("second", 0)
      .set("millisecond", 0)
      .toDate(); // Prisma sẽ tự chuyển về UTC khi lưu DB
  }

  // Nếu trong giờ hành chính, cộng thêm số phút quy định
  return vnTime.add(maxLateMinutes, "minute").toDate();
};

/**
 * HÀM TẠO KHÁCH HÀNG TỪ NGƯỜI GIỚI THIỆU (REFERRAL)
 * Đã tách biệt luồng MUA và BÁN/ĐỔI để tránh chặn trùng nhầm
 */
export async function createCustomerAction(rawData: any) {
  try {
    const now = new Date();
    const todayStart = dayjs().startOf("day").toDate();
    const auth = await getCurrentUser();
    if (!auth || !auth.id) throw new Error("Phiên đăng nhập hết hạn.");

    // 1. BÓC TÁCH VÀ CHUẨN HÓA DỮ LIỆU
    const {
      selectedCarId,
      budget,
      carYear,
      expectedPrice,
      tradeInModelId, // Dòng xe khách muốn đổi sang
      ...data
    } = rawData;

    // Ép kiểu dữ liệu để khớp với Prisma Schema (Expected String/Null)
    const finalBudget =
      budget !== undefined && budget !== null ? String(budget) : null;
    const finalYear =
      carYear !== undefined && carYear !== null ? String(carYear) : null;
    const finalExpectedPrice =
      expectedPrice !== undefined && expectedPrice !== null
        ? String(expectedPrice)
        : null;

    // Chuẩn hóa biển số xe
    const cleanPlate = data.licensePlate
      ? data.licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, "")
      : undefined;

    // 2. KIỂM TRA TRÙNG LẶP RIÊNG BIỆT (PHÂN LUỒNG MUA VÀ BÁN)
    const activeStatuses = {
      notIn: [LeadStatus.DEAL_DONE, LeadStatus.CANCELLED, LeadStatus.LOSE],
    };

    let existingCustomer = null;

    if (data.type === "BUY") {
      // LUỒNG MUA: Chỉ so sánh Số điện thoại + loại BUY
      existingCustomer = await db.customer.findFirst({
        where: {
          phone: data.phone,
          type: "BUY",
          status: activeStatuses,
        },
      });
    } else {
      // LUỒNG BÁN / ĐỔI / ĐỊNH GIÁ: Chỉ so sánh Biển số + loại KHÁC BUY
      if (cleanPlate) {
        existingCustomer = await db.customer.findFirst({
          where: {
            licensePlate: cleanPlate,
            type: { not: "BUY" },
            status: activeStatuses,
          },
        });
      }
    }

    // Xử lý chặn trùng (Chỉ cho qua nếu hồ sơ cũ đã bị Trễ - isLate)
    if (existingCustomer) {
      if (!existingCustomer.isLate) {
        const identity =
          data.type === "BUY" ? `SĐT ${data.phone}` : `Biển số ${cleanPlate}`;
        return {
          success: false,
          error: `${identity} hiện đang có yêu cầu đang xử lý trên hệ thống.`,
        };
      }
    }

    // 3. XÁC ĐỊNH CHI NHÁNH & PHÂN BỔ NHÂN VIÊN
    const referrer = await db.user.findUnique({
      where: { id: auth.id },
      select: { branchId: true },
    });

    if (!referrer?.branchId)
      throw new Error("Không thể xác định chi nhánh người giới thiệu.");

    let assignedStaffId: string | null = null;
    let assignmentLog = "";

    if (data.type === "BUY") {
      // 1. Lấy khoảng thời gian từ 00:00 đến 23:59 của ngày hôm nay
      const nowVN = dayjs().tz("Asia/Ho_Chi_Minh");

      // 2. Lấy mốc đầu ngày và cuối ngày chuẩn VN
      const startOfToday = nowVN.startOf("day").toDate();
      const endOfToday = nowVN.endOf("day").toDate();

      // 2. Truy vấn lịch trực trong khoảng ngày (tránh lệch miligiây hoặc múi giờ)
      const schedules = await db.salesSchedule.findMany({
        where: {
          branchId: referrer.branchId,
          date: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        select: { userId: true },
      });

      const onDutyIds = schedules.map((s) => s.userId);

      if (onDutyIds.length > 0) {
        // 3. Tìm nhân viên SALES đang trực, ưu tiên người ít nhận khách nhất (xoay vòng)
        const staff = await db.user.findFirst({
          where: {
            id: { in: onDutyIds },
            role: "SALES_STAFF",
            active: true,
          },
          orderBy: [
            { assignedCount: "asc" }, // 1. Ưu tiên người nhận ít khách nhất trong ngày/tổng
            { lastAssignedAt: "asc" }, // 2. Nếu bằng số khách, ưu tiên người chờ lâu nhất
          ],
        });

        if (staff) {
          assignedStaffId = staff.id;
          assignmentLog = `Phân bổ tự động cho ${staff.fullName} theo lịch trực Sales.`;
        }
      }
    } else {
      // Phân bổ xoay vòng cho Thu mua
      const staff = await db.user.findFirst({
        where: {
          branchId: referrer.branchId,
          role: "PURCHASE_STAFF",
          active: true,
        },
        orderBy: [
          { assignedCount: "asc" }, // 1. Ưu tiên người nhận ít khách nhất trong ngày/tổng
          { lastAssignedAt: "asc" }, // 2. Nếu bằng số khách, ưu tiên người chờ lâu nhất
        ],
      });
      if (staff) {
        assignedStaffId = staff.id;
        assignmentLog = "Phân bổ xoay vòng Thu mua.";
      }
    }

    // 4. TRANSACTION: LƯU DỮ LIỆU
    const result = await db.$transaction(async (tx) => {
      const config = await tx.leadSetting.findFirst();
      const maxLate = config?.maxLateMinutes || 30;

      const finalDeadline = calculateDeadline(now, Number(maxLate));

      // Nếu khách chọn xe từ kho
      const stockCarInfo = selectedCarId
        ? await tx.car.findUnique({ where: { id: selectedCarId } })
        : null;
      const stockNote = stockCarInfo
        ? `\n[XE TRONG KHO]: ${stockCarInfo.stockCode} - ${stockCarInfo.modelName}`
        : "";

      const commonData: any = {
        ...data,
        licensePlate: cleanPlate,
        carYear: finalYear,
        budget: finalBudget,
        expectedPrice: finalExpectedPrice,
        tradeInModelId: tradeInModelId || null,
        status: assignedStaffId ? LeadStatus.ASSIGNED : LeadStatus.NEW,
        assignedToId: assignedStaffId,
        assignedAt: assignedStaffId ? now : null,
        isLate: false,
        lastFrozenAt: null,
        branchId: referrer.branchId,
        referralDate: now,
        note: data.note ? `${data.note}${stockNote}` : stockNote,
      };

      let customer;

      if (existingCustomer?.isLate) {
        // --- TÁI SINH LEAD (Dành cho khách bị trễ) ---
        customer = await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            ...commonData,
            activities: {
              create: {
                status: assignedStaffId ? LeadStatus.ASSIGNED : LeadStatus.NEW,
                note: `[TÁI SINH]: ${assignmentLog}. Khách cũ bị trễ từ người giới thiệu trước.`,
                createdById: auth.id,
              },
            },
            tasks: assignedStaffId
              ? {
                  create: {
                    title: "📞 Liên hệ lại khách hàng (Tái sinh Lead)",
                    content: `Khách bị trễ, cần xử lý ngay. Nhu cầu: ${data.type}`,
                    scheduledAt: now,
                    deadlineAt: finalDeadline,
                    status: TaskStatus.PENDING,
                    type: data.type === "BUY" ? "SALES" : "PURCHASE",
                    assigneeId: assignedStaffId,
                  },
                }
              : undefined,
          },
        });
      } else {
        // --- TẠO MỚI HOÀN TOÀN ---
        customer = await tx.customer.create({
          data: {
            ...commonData,
            leadCar: {
              create: {
                carModelId: stockCarInfo
                  ? stockCarInfo.carModelId
                  : data.carModelId,
                modelName: stockCarInfo ? stockCarInfo.modelName : undefined,
                licensePlate: stockCarInfo
                  ? stockCarInfo.licensePlate
                  : cleanPlate,
                year: stockCarInfo
                  ? stockCarInfo.year
                  : finalYear
                    ? parseInt(finalYear)
                    : undefined,
                expectedPrice: stockCarInfo
                  ? stockCarInfo.sellingPrice
                  : finalExpectedPrice,
                note: stockCarInfo ? "Khách chọn từ kho xe." : undefined,
              },
            },
            activities: {
              create: {
                status: assignedStaffId ? LeadStatus.ASSIGNED : LeadStatus.NEW,
                note: assignmentLog || "Khách hàng mới được tạo từ giới thiệu.",
                createdById: auth.id,
              },
            },
            tasks: assignedStaffId
              ? {
                  create: {
                    title: "📞 Liên hệ khách hàng mới",
                    content: `Tiếp nhận khách hàng từ ${assignmentLog}`,
                    scheduledAt: now,
                    deadlineAt: finalDeadline,
                    status: TaskStatus.PENDING,
                    type: data.type === "BUY" ? "SALES" : "PURCHASE",
                    assigneeId: assignedStaffId,
                  },
                }
              : undefined,
          },
        });
      }

      // Cập nhật lượt phân bổ cho nhân viên
      if (assignedStaffId) {
        await tx.user.update({
          where: { id: assignedStaffId },
          data: {
            lastAssignedAt: now,
            assignedCount: { increment: 1 }, // Tăng số lượng lên 1
          },
        });
      }

      return customer;
    });

    // 5. GỬI EMAIL THÔNG BÁO (NGOÀI TRANSACTION ĐỂ TRÁNH BLOCK DB)
    // 5. GỬI EMAIL THÔNG BÁO (NGOÀI TRANSACTION)
    if (result) {
      const typeLabelVn = getReferralTypeLabel(result.type);

      // 1. Fetch toàn bộ dữ liệu cần thiết 1 lần duy nhất
      const [branch, referrerUser, staff, branchAdmins] = await Promise.all([
        referrer.branchId
          ? db.branch.findUnique({ where: { id: referrer.branchId } })
          : null,
        db.user.findUnique({ where: { id: auth.id }, select: { email: true } }),
        assignedStaffId
          ? db.user.findUnique({
              where: { id: assignedStaffId },
              select: { email: true, fullName: true, phone: true },
            })
          : null,
        db.user.findMany({
          where: {
            branchId: referrer.branchId,
            role: {
              in: ["ADMIN", "MANAGER"],
            },
            active: true,
          },
          select: { email: true },
        }),
      ]);

      const branchName = branch?.name || "Hệ thống";
      const referrerEmail = referrerUser?.email;
      const emailPromises = [];

      // A. Gửi cho nhân viên được phân bổ
      if (staff?.email) {
        if (assignedStaffId) {
          // 1. Bắn Firebase Push (Thay cho OneSignal)
          sendFirebasePush({
            userIds: [assignedStaffId],
            title: "🚗 TOYOTA BÌNH DƯƠNG",
            body: `Nhiệm vụ mới: Chăm sóc khách hàng ${result.fullName}`,
            url: "/dashboard/assigned-tasks",
          });
        }
        emailPromises.push(
          sendMail({
            to: staff.email,
            subject: `[NHIỆM VỤ] Phân bổ khách hàng: ${result.fullName.toUpperCase()}`,
            html: staffAssignmentEmailTemplate({
              customerName: result.fullName,
              customerPhone: result.phone,
              typeLabel: typeLabelVn,
              details: result.note || "Không có ghi chú thêm",
              branchName,
            }),
          }),
        );
      }

      // B. Gửi cho Admin chi nhánh
      const adminEmails = branchAdmins.map((a) => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        sendFirebasePush({
          emails: adminEmails,
          title: "HỆ THỐNG TOYOTA",
          body: `${auth.fullName} vừa giới thiệu khách: ${result.fullName}`,
          url: "/dashboard/customers",
        });
        emailPromises.push(
          sendMail({
            to: adminEmails.join(","),
            subject: `[HỆ THỐNG] Có lời giới thiệu mới`,
            html: referralEmailTemplate({
              customerName: result.fullName,
              typeLabel: typeLabelVn,
              referrerName: auth.fullName || auth.username,
              details: result.note || "Không có ghi chú thêm",
              branchName,
            }),
          }),
        );
      }

      // C. Gửi xác nhận cho Người giới thiệu
      if (referrerEmail) {
        emailPromises.push(
          sendMail({
            to: referrerEmail,
            subject: `[XÁC NHẬN] Gửi thông tin khách hàng ${result.fullName.toUpperCase()} thành công`,
            html: referrerConfirmationEmailTemplate({
              referrerName: auth.fullName || auth.username,
              customerName: result.fullName,
              typeLabel: typeLabelVn,
              staffName: staff?.fullName || "Đang đợi phân bổ",
              staffPhone: staff?.phone || "Đang đợi phân bổ",
            }),
          }),
        );
      }

      // Thực thi (Giữ nguyên logic non-blocking của bạn vì nó rất tốt)
      const results = await Promise.allSettled(emailPromises);

      results.forEach((res, i) => {
        if (res.status === "rejected") {
          console.error(`❌ Email task ${i} failed:`, res.reason);
        }
      });
    }

    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/referrals/new");

    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    console.error("🔥 createCustomerAction Error:", error.message);
    return { success: false, error: error.message || "Lỗi hệ thống" };
  }
}
/**
 * 2. CẬP NHẬT TRẠNG THÁI KÈM LÝ DO & TÍNH TOÁN ĐỘ GẤP (URGENCY)
 */
export async function updateCustomerStatusAction(
  customerId: string,
  status: LeadStatus,
  note: string,
  userId: string,
  nextContactAt?: Date, // Cho phép hẹn ngày gọi lại
) {
  try {
    const now = new Date();

    await db.$transaction(async (tx) => {
      const updateData: any = { status, lastContactAt: now };

      if (nextContactAt) {
        updateData.nextContactAt = nextContactAt;
      }

      updateData.firstContactAt = now;

      // 1. Cập nhật khách hàng
      await tx.customer.update({
        where: { id: customerId },
        data: updateData,
      });

      // 2. Ghi log vào bảng LeadActivity
      await tx.leadActivity.create({
        data: {
          customerId,
          status,
          note,
          createdById: userId,
        },
      });
    });

    revalidatePath("/dashboard/customers");

    return { success: true };
  } catch (error: any) {
    console.error(error); // Xem chi tiết lỗi Prisma ở đây
    return { success: false, error: error.message || "Lỗi hệ thống nội bộ" };
  }
}

/**
 * 4. PHÂN BỔ THỦ CÔNG (CŨNG TÍNH THỜI GIAN GIAO)
 */

export async function assignCustomerAction(
  customerId: string,
  staffId: string,
) {
  try {
    const now = new Date();

    await db.$transaction(async (tx) => {
      // 1. Lấy cấu hình Admin
      const config = await tx.leadSetting.findFirst();
      const maxLate = config?.maxLateMinutes || 30;

      // 2. Hủy các Task PENDING cũ của người trước (nếu có) để tránh chồng chéo
      await tx.task.updateMany({
        where: { customerId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      // 3. Cập nhật Customer và Tạo Task mới cho Staff mới
      await tx.customer.update({
        where: { id: customerId },
        data: {
          assignedToId: staffId,
          status: LeadStatus.ASSIGNED,
          assignedAt: now,
          // Tạo Task trực tiếp trong update customer
          tasks: {
            create: {
              title: "📞 Tiếp nhận khách hàng (Phân bổ thủ công)",
              content: "Bạn được quản lý chỉ định chăm sóc khách hàng này.",
              scheduledAt: now,
              deadlineAt: dayjs(now).add(maxLate, "minute").toDate(),
              assigneeId: staffId,
              status: "PENDING",
            },
          },
        },
      });

      // 4. Ghi log Activity cho việc chuyển giao
      await tx.leadActivity.create({
        data: {
          customerId,
          status: LeadStatus.ASSIGNED,
          note: `Quản lý đã phân bổ khách hàng này cho bạn.`,
          createdById: staffId, // Hoặc ID của người thực hiện phân bổ
        },
      });

      // 5. Cập nhật lượt chia cho User
      await tx.user.update({
        where: { id: staffId },
        data: { lastAssignedAt: now },
      });
    });

    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Lỗi phân bổ thủ công." };
  }
}

/**
 * 5. LẤY DANH SÁCH (Bổ sung các trường thời gian mới)
 */

export async function getCustomersAction(filters?: {
  searchText?: string;
  carModelName?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const isMarketing = currentUser.role === "MARKETING";
    const isGlobalPower =
      currentUser.role === "ADMIN" ||
      currentUser.isGlobalManager ||
      isMarketing;

    const where: any = {};

    // Phân quyền chi nhánh
    if (!isGlobalPower) {
      where.branchId = currentUser.branchId;
    }

    // Logic tìm kiếm
    const andConditions: any[] = [];
    if (filters?.searchText) {
      andConditions.push({
        OR: [
          { fullName: { contains: filters.searchText } },
          { phone: { contains: filters.searchText } },
          { licensePlate: { contains: filters.searchText } },
        ],
      });
    }
    if (filters?.carModelName) {
      andConditions.push({
        carModel: { name: { contains: filters.carModelName } },
      });
    }
    if (andConditions.length > 0) where.AND = andConditions;

    // Định nghĩa cấu trúc select an toàn cho Type-safety
    const marketingSelect = {
      fullName: true,
      phone: true,
      createdAt: true,
      type: true,
      source: true,
      assignedTo: { select: { fullName: true } },
      branch: { select: { name: true } },
      carModel: { select: { name: true } },
      referrer: { select: { fullName: true } },
    };

    const adminSelect = {
      id: true,
      fullName: true,
      phone: true,
      status: true,
      createdAt: true,
      assignedTo: { select: { fullName: true, id: true } },
      branch: { select: { name: true } },
      carModel: { select: { name: true } },
      referrer: {
        select: {
          fullName: true,
          username: true,
          branch: { select: { name: true } },
        },
      },
      activities: {
        select: {
          id: true,
          note: true,
          createdAt: true,
          user: { select: { fullName: true } },
          reason: { select: { content: true } },
        },
      },
    };

    // Thực thi truy vấn
    const [total, rawCustomers] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findMany({
        where,
        select: isMarketing ? marketingSelect : adminSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    // Xử lý sắp xếp activities cho admin (nếu cần)
    const data = rawCustomers.map((customer: any) => {
      if (customer.activities && Array.isArray(customer.activities)) {
        customer.activities.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
      return customer;
    });

    return {
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error: any) {
    console.error("Lỗi getCustomersAction:", error);
    return {
      data: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    };
  }
}

export async function getMyReferralsAction() {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  try {
    const referrals = await db.customer.findMany({
      where: {
        referrerId: auth.id,
      },
      include: {
        // Lấy thông tin dòng xe quan tâm
        carModel: {
          select: { name: true },
        },
        // Lấy thông tin giao dịch nếu deal đã xong
        // carOwnerHistories: {
        //   include: {
        //     car: {
        //       select: {
        //         stockCode: true,
        //         modelName: true,
        //         licensePlate: true,
        //       },
        //     },
        //   },
        //   orderBy: { date: "desc" },
        //   take: 1,
        // },
      },
      orderBy: {
        createdAt: "desc", // Khách mới nhất lên đầu
      },
    });

    return referrals;
  } catch (error: any) {
    console.error("Error fetching referrals:", error);
    throw new Error("Không thể tải lịch sử giới thiệu");
  }
}

export async function createSelfAssignedLeadAction(formData: any) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Bạn cần đăng nhập để thực hiện hành động này");

  const {
    fullName,
    phone,
    carModelId,
    carYear,
    licensePlate,
    budget,
    expectedPrice,
    note,
  } = formData;

  try {
    const newLead = await db.$transaction(async (tx) => {
      // 1. Tạo khách hàng mới
      const customer = await tx.customer.create({
        data: {
          fullName,
          phone,
          type: auth.role === "PURCHASE_STAFF" ? "SELL" : "BUY",
          carModelId,
          carYear,
          licensePlate,
          budget: String(budget),
          expectedPrice,
          note,

          // QUAN TRỌNG: Tự giới thiệu và tự phân bổ
          referrerId: auth.id, // Người giới thiệu là tôi
          assignedToId: auth.id, // Người xử lý cũng là tôi

          // Cập nhật trạng thái và thời gian bàn giao ngay lập tức
          status: LeadStatus.ASSIGNED,
          assignedAt: new Date(),
          urgencyLevel: UrgencyType.HOT, // Tự mình nhập thì thường là khách đang HOT
        },
      });

      // 2. Tạo một bản ghi Activity để lưu vết lịch sử
      await tx.leadActivity.create({
        data: {
          customerId: customer.id,
          status: LeadStatus.ASSIGNED,
          note: "Nhân viên tự tạo khách hàng và nhận chăm sóc trực tiếp.",
          createdById: auth.id,
        },
      });

      return customer;
    });

    revalidatePath("/dashboard/assigned-tasks"); // Refresh lại trang danh sách nhiệm vụ
    return { success: true, data: newLead };
  } catch (error: any) {
    console.error("Lỗi tạo Lead tự gán:", error);
    throw new Error(error.message || "Không thể tạo khách hàng");
  }
}

export async function getFrozenLeadsAction(filters?: {
  search?: string;
  staffId?: string;
}) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Phiên đăng nhập hết hạn");

  try {
    const isGlobalPower = auth.role === "ADMIN" || auth.isGlobalManager;

    // Điều kiện mặc định
    const where: any = {
      status: "FROZEN",
    };

    // Phân quyền chi nhánh
    if (!isGlobalPower) {
      if (!auth.branchId) return [];
      where.branchId = auth.branchId;
    }

    // Lọc theo nhân viên tiếp nhận
    if (filters?.staffId) {
      where.assignedToId = filters.staffId;
    }

    // Lọc theo Tên, SĐT hoặc Biển số xe (Search)
    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { licensePlate: { contains: filters.search } },
        { leadCar: { licensePlate: { contains: filters.search } } },
      ];
    }

    const leads = await db.customer.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, fullName: true, phone: true } },
        referrer: { select: { id: true, fullName: true, role: true } },
        branch: { select: { id: true, name: true } },
        carModel: { select: { id: true, name: true } },
        leadCar: { select: { id: true, modelName: true, licensePlate: true } },
        activities: {
          where: { status: "FROZEN" },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            reason: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { lastFrozenAt: "desc" },
    });

    // Helper chuyển đổi trạng thái/loại sang tiếng Việt
    const translateReferralType = (type: string) => {
      const map: any = {
        SELL: "Bán xe",
        BUY: "Mua xe",
        VALUATION: "Định giá",
        SELL_TRADE_NEW: "Đổi xe mới",
        SELL_TRADE_USED: "Đổi xe cũ",
      };
      return map[type] || type;
    };

    const serializedLeads = JSON.parse(JSON.stringify(leads)).map(
      (item: any) => ({
        ...item,
        typeVietnamese: translateReferralType(item.type),
      }),
    );

    return serializedLeads;
  } catch (error) {
    console.error("Lỗi lấy danh sách đóng băng:", error);
    return [];
  }
}

export async function getLeadsAction(params: {
  search?: string;
  status?: string;
  type?: string; // <--- Thêm lọc theo loại khách hàng
  page?: number;
  limit?: number;
  branch?: string;
  startDate?: string;
  endDate?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { role, id: userId, branchId, isGlobalManager } = user;
  const {
    search,
    status,
    type, // <--- Destructure type
    page = 1,
    limit = 10,
    branch,
    startDate,
    endDate,
  } = params;

  // 1. Khởi tạo điều kiện gốc (Base Conditions)
  let whereClause: any = { AND: [] };

  // --- 2. PHÂN QUYỀN TRUY CẬP (Role-based) ---
  if (role === "ADMIN" || isGlobalManager) {
    // Admin/Global: Nếu chọn chi nhánh cụ thể thì lọc, nếu là "ALL" thì không thêm điều kiện branchId
    if (branch && branch !== "ALL") {
      whereClause.AND.push({ branchId: branch });
    }
  } else if (role === "MANAGER") {
    // Manager: Luôn luôn chỉ thấy chi nhánh của mình
    whereClause.AND.push({ branchId: branchId });
  } else {
    // Staff: Chỉ thấy khách mình được phân công hoặc mình giới thiệu
    whereClause.AND.push({
      OR: [{ assignedToId: userId }, { referrerId: userId }],
    });
  }

  // --- 3. LỌC THEO TRẠNG THÁI ---

  if (type && type !== "ALL") {
    if (type === "BUY") {
      whereClause.AND.push({ type: "BUY" });
    } else if (type === "SELL") {
      whereClause.AND.push({ type: "SELL" });
    } else if (type === "TRADE") {
      // Lọc các loại liên quan đến trao đổi (đổi xe mới hoặc xe cũ)
      whereClause.AND.push({
        type: { in: ["SELL_TRADE_NEW", "SELL_TRADE_USED"] },
      });
    }
  }

  if (status && status !== "ALL") {
    whereClause.AND.push({ status: status });
  }
  if (startDate || endDate) {
    whereClause.AND.push({
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    });
  }
  // --- 4. TÌM KIẾM TỪ KHÓA (Search) ---
  if (search) {
    whereClause.AND.push({
      OR: [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { licensePlate: { contains: search } },
        {
          carModel: {
            name: { contains: search },
          },
        },
      ],
    });
  }

  // --- 5. TRUY VẤN ---
  const [data, total] = await Promise.all([
    db.customer.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { fullName: true, phone: true } },
        referrer: { select: { fullName: true, role: true } },
        branch: { select: { name: true } },
        carModel: { select: { name: true } },
        leadCar: true,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.customer.count({ where: whereClause }),
  ]);

  // --- 6. SERIALIZE DECIMAL ---
  const serializedData = JSON.parse(JSON.stringify(data));

  return { data: serializedData, total };
}

// actions/customer-actions.ts
export async function getOverdueCustomersAction(params: {
  name?: string;
  staffName?: string;
  type?: string;
}) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  const sixtyDaysAgo = dayjs().subtract(60, "day").toDate();

  // Phân quyền: Admin xem tất cả, Quản lý chi nhánh chỉ xem chi nhánh của mình
  const isAdmin = ["ADMIN", "ADMIN_MANAGER"].includes(auth.role);

  const where: any = {
    createdAt: { lt: sixtyDaysAgo },
    status: { notIn: ["DEAL_DONE", "CANCELLED", "LOSE", "FROZEN"] },
  };

  // Nếu không phải Admin, bắt buộc lọc theo branchId của User đang đăng nhập
  if (!isAdmin) {
    where.branchId = auth.branchId;
  }

  // Bộ lọc tìm kiếm
  if (params.name) {
    where.fullName = { contains: params.name };
  }
  if (params.type) {
    where.type = params.type;
  }
  if (params.staffName) {
    where.assignedTo = {
      fullName: { contains: params.staffName },
    };
  }

  return await db.customer.findMany({
    where,
    include: {
      assignedTo: { select: { fullName: true, branch: true } },
      branch: true,
      carModel: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

// 2. Gửi Email nhắc nhở (Mockup logic gửi mail)
export async function sendReminderEmailAction(customerIds: string[]) {
  try {
    const auth = await getCurrentUser();
    if (!auth) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này");
    // 1. Lấy thông tin chi tiết khách hàng và người liên quan
    const customers = await db.customer.findMany({
      where: { id: { in: customerIds } },
      include: {
        referrer: true,
        assignedTo: true,
        branch: true,
      },
    });

    if (customers.length === 0) {
      return { success: false, error: "Không tìm thấy dữ liệu khách hàng" };
    }

    // 2. Duyệt qua từng khách hàng để tạo mail và gửi
    for (const cust of customers) {
      const daysPending = dayjs().diff(dayjs(cust.createdAt), "day");

      // Tạo nội dung HTML từ template chuyên nghiệp
      const htmlBody = overdueCustomerReminderEmailTemplate({
        customerName: cust.fullName,
        customerPhone: cust.phone,
        staffName: cust.assignedTo?.fullName || "Chưa phân bổ",
        referrerName: cust.referrer?.fullName || "Hệ thống",
        createdAt: dayjs(cust.createdAt).format("DD/MM/YYYY"),
        daysPending: daysPending,
        typeLabel: cust.type === "SELL" ? "THU MUA" : "BÁN XE", // Bạn có thể thêm logic map type chi tiết hơn ở đây
        branchName: cust.branch?.name || "Tổng công ty",
      });

      const subject = `[CẢNH BÁO QUÁ HẠN] Hồ sơ khách hàng: ${cust.fullName.toUpperCase()} (${daysPending} ngày)`;

      // 3. Thực hiện gửi mail đồng thời cho cả Nhân viên và Người giới thiệu
      const recipients = [];
      if (cust.assignedTo?.email) recipients.push(cust.assignedTo.email);
      if (cust.referrer?.email) recipients.push(cust.referrer.email);

      if (recipients.length > 0) {
        // Gửi mail (Dùng Promise.all nếu muốn gửi song song cho nhanh)
        await Promise.all(
          recipients.map((email) =>
            sendMail({
              to: email,
              subject: subject,
              html: htmlBody,
            }),
          ),
        );
      }

      // 4. Ghi nhận vào nhật ký hệ thống (Activity Log) để biết đã gửi mail nhắc nhở
      await db.leadActivity.create({
        data: {
          customerId: cust.id,
          status: cust.status,
          note: `[HỆ THỐNG]: Đã gửi email cảnh báo quá hạn.`,
          createdById: auth.id, // Hoặc lấy ID của admin đang thực hiện
        },
      });
    }

    return {
      success: true,
      message: `Đã gửi thành công ${customers.length} thông báo.`,
    };
  } catch (error: any) {
    console.error("Lỗi gửi mail nhắc nhở:", error);
    return {
      success: false,
      error: error.message || "Lỗi hệ thống khi gửi mail",
    };
  }
}

// 3. Đóng băng khách hàng
export async function freezeOverdueCustomersAction(customerIds: string[]) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Unauthorized");

  try {
    // 1. Lấy thông tin chi tiết khách hàng và nhân viên trước khi đóng băng để gửi mail
    const customersToFreeze = await db.customer.findMany({
      where: { id: { in: customerIds } },
      include: {
        assignedTo: { select: { email: true, fullName: true } },
        carModel: { select: { name: true } },
      },
    });

    await db.$transaction(async (tx) => {
      // 2. Cập nhật trạng thái và bật cờ isLate
      await tx.customer.updateMany({
        where: { id: { in: customerIds } },
        data: {
          status: "FROZEN",
          isLate: true, // Đánh dấu trễ để cho phép tái sử dụng sau này
          lastFrozenAt: new Date(),
        },
      });

      // 3. Tạo lịch sử cho từng khách
      const logs = customerIds.map((id) => ({
        customerId: id,
        createdById: auth.id,
        status: "FROZEN" as const,
        note: "[HỆ THỐNG]: Tự động đóng băng & giải phóng quyền ưu tiên do hồ sơ quá hạn xử lý.",
      }));

      await tx.leadActivity.createMany({ data: logs });
    });

    // 4. GỬI EMAIL THÔNG BÁO THU HỒI (Chạy ngầm sau transaction)
    (async () => {
      for (const customer of customersToFreeze) {
        if (customer.assignedTo?.email) {
          try {
            await sendMail({
              to: customer.assignedTo.email,
              subject: `[THÔNG BÁO] Thu hồi khách hàng ${customer.fullName} do quá hạn KPI`,
              html: lateLeadRecallEmailTemplate({
                staffName: customer.assignedTo.fullName || "Nhân viên",
                customerName: customer.fullName,
                lateMinutes: 60 * 24 * 60, // Bạn có thể tính toán số phút trễ thực tế ở đây
                typeLabel: customer.type === "BUY" ? "MUA XE" : "THU MUA",
              }),
            });
          } catch (mailErr) {
            console.error(
              `Lỗi gửi mail cho ${customer.assignedTo.email}:`,
              mailErr,
            );
          }
        }
      }
    })();

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/frozen-leads");
    return { success: true };
  } catch (error) {
    console.error("Freeze Action Error:", error);
    return { success: false };
  }
}

export async function getLeadsWithoutSensitiveAction(params: {
  search?: string;
  status?: string;
  branchId?: string; // Thêm lọc chi nhánh
  startDate?: string; // Thêm ngày bắt đầu
  endDate?: string; // Thêm ngày kết thúc
  page?: number;
  limit?: number;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { role, id: userId, branchId: userBranchId, isGlobalManager } = user;
  const {
    search,
    status,
    branchId,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = params;

  let whereClause: any = {};

  // --- 1. PHÂN QUYỀN (BASE SCOPE) ---
  if (role === "ADMIN" || role === "SALE_MANAGER" || isGlobalManager) {
    whereClause = {};
  } else if (role === "MANAGER") {
    whereClause = { branchId: userBranchId };
  } else {
    whereClause = {
      OR: [{ assignedToId: userId }, { referrerId: userId }],
    };
  }

  // --- 2. LỌC NÂNG CAO ---

  // Lọc theo chi nhánh (Nếu là Admin/Global có thể chọn lọc chi nhánh bất kỳ)
  if (branchId && branchId !== "ALL") {
    whereClause.branchId = branchId;
  }

  // Lọc theo trạng thái
  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  // Lọc theo khoảng ngày (Dựa trên createdAt)
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) {
      whereClause.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      // Đảm bảo lấy đến cuối ngày của endDate
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = end;
    }
  }

  // Lọc theo từ khóa tìm kiếm
  if (search) {
    const searchFilter = {
      OR: [
        { fullName: { contains: search } },
        // Có thể thêm search theo ghi chú nếu cần
        // { note: { contains: search } },
      ],
    };

    if (whereClause.AND) {
      whereClause.AND.push(searchFilter);
    } else {
      whereClause.AND = [searchFilter];
    }
  }

  // --- 3. QUERY ---
  const [data, total] = await Promise.all([
    db.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        status: true,
        createdAt: true,
        urgencyLevel: true,
        inspectStatus: true,
        type: true,
        branchId: true, // Thêm để kiểm tra nếu cần
        assignedTo: {
          select: { fullName: true },
        },
        referrer: {
          select: { fullName: true, role: true },
        },
        branch: {
          select: { name: true },
        },
        carModel: {
          select: { name: true },
        },
        leadCar: {
          select: {
            id: true,
            tSurePrice: true,
            expectedPrice: true,
            finalPrice: true,
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            note: true,
            createdAt: true,
            user: {
              select: { fullName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.customer.count({ where: whereClause }),
  ]);

  // --- 4. FIX SERIALIZATION (DECIMAL & DATES) ---
  const serializedData = data.map((customer) => ({
    ...customer,
    leadCar: customer.leadCar
      ? {
          ...customer.leadCar,
          tSurePrice: customer.leadCar.tSurePrice
            ? Number(customer.leadCar.tSurePrice)
            : null,
          expectedPrice: customer.leadCar.expectedPrice
            ? Number(customer.leadCar.expectedPrice)
            : null,
          finalPrice: customer.leadCar.finalPrice
            ? Number(customer.leadCar.finalPrice)
            : null,
        }
      : null,
  }));

  return { data: serializedData, total };
}

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { oneSignalClient } from "@/lib/onesignal";
import { sendFirebasePush } from "@/lib/push-service";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function getStaffOnDutyAction() {
  try {
    const auth = await getCurrentUser();
    if (!auth || !auth.id) {
      throw new Error("Phiên đăng nhập hết hạn.");
    }

    // 1. Xác định "Bây giờ" theo giờ VN
    const nowVN = dayjs().tz("Asia/Ho_Chi_Minh");

    // 2. Lấy mốc 00:00:00 và 23:59:59 của ngày hôm nay tại VN
    const todayStart = nowVN.startOf("day").toDate();
    const todayEnd = nowVN.endOf("day").toDate();

    // Log để kiểm tra (Server console)
    console.log(
      "Truy vấn lịch từ:",
      todayStart.toISOString(),
      "đến:",
      todayEnd.toISOString(),
    );

    const schedules = await db.salesSchedule.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        branch: { select: { name: true } },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            active: true,
            lastAssignedAt: true,
            branchId: true,
          },
        },
      },
    });

    const staffOnDuty = schedules
      .filter((s) => s.user && s.user.active)
      .map((s) => ({
        ...s.user,
        branchName: s.branch?.name || "N/A",
      }));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(staffOnDuty)),
    };
  } catch (error: any) {
    console.error("🔥 getStaffOnDutyAction Error:", error.message);
    return { success: false, error: "Lỗi hệ thống khi lấy danh sách trực." };
  }
}

export async function deleteCustomerAction(customerId: string) {
  try {
    // 1. Kiểm tra quyền hạn
    const auth = await getCurrentUser();
    if (!auth || !auth.id) throw new Error("Phiên đăng nhập hết hạn.");

    // Lưu ý: Có thể thêm kiểm tra Role ở đây, ví dụ chỉ ADMIN mới được xóa
    if (auth.role !== "ADMIN" || !auth.isGlobalManager)
      throw new Error("Bạn không có quyền thực hiện thao tác này.");

    // 2. Thực hiện xóa trong Transaction
    await db.$transaction(async (tx) => {
      // A. Xóa các Task liên quan đến khách hàng
      await tx.task.deleteMany({
        where: { customerId: customerId },
      });

      // B. Xóa các LeadActivity (Nhật ký chăm sóc)
      await tx.leadActivity.deleteMany({
        where: { customerId: customerId },
      });

      // C. Xóa LeadCar (Thông tin xe giám định - Quan hệ 1:1)
      await tx.leadCar.deleteMany({
        where: { customerId: customerId },
      });

      // D. Cuối cùng mới xóa Customer
      await tx.customer.delete({
        where: { id: customerId },
      });
    });

    // 3. Làm mới cache dữ liệu
    revalidatePath("/dashboard/customers");

    return {
      success: true,
      message: "Đã xóa khách hàng và các dữ liệu liên quan.",
    };
  } catch (error: any) {
    console.error("🔥 deleteCustomerAction Error:", error.message);
    return { success: false, error: error.message || "Lỗi khi xóa dữ liệu." };
  }
}

export type GetCustomersParams = {
  tab: "done" | "frozen" | "lost" | "pending-approval";
  search?: string;
  page?: number;
  pageSize?: number;
  province?: string;
  carModelId?: string;
};

export async function getCustomerList({
  tab,
  search,
  page = 1,
  pageSize = 10,
  province,
  carModelId,
}: GetCustomersParams) {
  try {
    const auth = await getCurrentUser();
    const userId = auth?.id;

    if (!userId) {
      return { success: false, message: "Phiên đăng nhập hết hạn." };
    }

    const skip = (page - 1) * pageSize;
    const isAdmin = auth?.role === "ADMIN" || auth?.role === "MANAGER";

    // --- 1. KHỞI TẠO ĐIỀU KIỆN LỌC (WHERE) ---
    let where: Prisma.CustomerWhereInput = {};

    // --- 2. LOGIC THEO TỪNG TAB ---
    switch (tab) {
      case "frozen":
        // Khách bị đóng băng HOẶC khách trễ tiến độ chăm sóc
        where.AND = [
          { assignedToId: isAdmin ? undefined : userId }, // Admin xem hết, Sale xem của mình
          {
            OR: [{ status: "FROZEN" }, { isLate: true }],
          },
        ];
        break;

      case "lost":
        // Khách đã thất bại
        where.status = "LOSE";
        if (!isAdmin) where.assignedToId = userId;
        break;
      case "done":
        // Khách đã hoàn thành
        where.status = "DEAL_DONE";
        if (!isAdmin) where.assignedToId = userId;
        break;
      case "pending-approval":
        // Các trạng thái chờ Admin duyệt
        where.status = {
          in: [
            "PENDING_DEAL_APPROVAL",
            "PENDING_LOSE_APPROVAL",
            "PENDING_VIEW",
          ],
        };
        // Sale chỉ thấy yêu cầu mình gửi, Admin thấy tất cả
        if (!isAdmin) where.assignedToId = userId;
        break;
    }

    // --- 3. BỘ LỌC NÂNG CAO (GLOBAL FILTERS) ---

    // Tìm kiếm (Search)
    if (search) {
      const searchCondition = {
        OR: [
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { licensePlate: { contains: search } },
        ],
      };

      // Kết hợp search vào điều kiện where hiện tại
      where = { ...where, ...searchCondition };
    }

    // Lọc theo tỉnh thành
    if (province) {
      where.province = province;
    }

    // Lọc theo dòng xe
    if (carModelId) {
      where.carModelId = carModelId;
    }

    // --- 4. TRUY VẤN DB ---
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          carModel: true,
          assignedTo: { select: { fullName: true } },
          _count: { select: { activities: true, tasks: true } },
        },
        orderBy: {
          updatedAt: "desc", // Ưu tiên những khách vừa có tương tác lên đầu
        },
      }),
      db.customer.count({ where }),
    ]);

    return {
      success: true,
      data: customers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("🔥 GET_CUSTOMERS_ERROR:", error);
    return {
      success: false,
      message: "Lỗi hệ thống khi lấy danh sách khách hàng.",
    };
  }
}
export type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: {
    carModel: true;
    referrer: { select: { fullName: true; role: true } };
    assignedTo: { select: { fullName: true } };
    sellReason: true;
    _count: { select: { activities: true } };
  };
}>;
