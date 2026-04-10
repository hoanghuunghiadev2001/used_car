"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-server";
import { Role } from "@prisma/client";

export type ActivityFilter = {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  staffId?: string;
  staffType?: "PURCHASE_STAFF" | "SALES_STAFF" | "ALL";
  branchId?: string;
};

// ==========================================
// PHÂN LOẠI ROLE
// ==========================================

// Có quyền xem tất cả / theo chi nhánh
const MANAGER_ROLES: Role[] = [
  Role.ADMIN,
  Role.MANAGER,
  Role.SALE_MANAGER,
  Role.ADMIN_MANAGER,
];

// Nhân viên chỉ được xem của chính họ
const STAFF_ROLES: Role[] = [Role.PURCHASE_STAFF, Role.SALES_STAFF];

// ==========================================
// HELPER: Xác thực & trả về ngữ cảnh quyền
// ==========================================
async function requireAuth() {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Bạn cần đăng nhập để thực hiện hành động này");

  const user = await db.user.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      fullName: true,
      role: true,
      branchId: true,
      isGlobalManager: true,
    },
  });

  if (!user) throw new Error("Không tìm thấy tài khoản");

  const isManager = MANAGER_ROLES.includes(user.role);
  const isStaff = STAFF_ROLES.includes(user.role);

  if (!isManager && !isStaff) {
    throw new Error("Bạn không có quyền truy cập trang này");
  }

  return {
    ...user,
    isManager,
    isStaff,
    // Global manager: xem xuyên chi nhánh
    // Manager thường: chỉ xem chi nhánh mình
    // Staff: chỉ xem của chính mình
  };
}

// ==========================================
// HELPER: Tạo điều kiện where dựa theo quyền
// ==========================================
function buildStaffWhere(
  currentUser: Awaited<ReturnType<typeof requireAuth>>,
  filter: ActivityFilter,
) {
  const { staffId, staffType = "ALL", branchId } = filter;

  // --- NHÂN VIÊN: chỉ xem của chính mình, bỏ qua mọi filter ---
  if (currentUser.isStaff) {
    return { createdById: currentUser.id };
  }

  // --- MANAGER ---
  const roleFilter: Role[] = [];
  if (staffType === "PURCHASE_STAFF" || staffType === "ALL")
    roleFilter.push(Role.PURCHASE_STAFF);
  if (staffType === "SALES_STAFF" || staffType === "ALL")
    roleFilter.push(Role.SALES_STAFF);

  // Nếu không phải Global Manager → bị giới hạn về chi nhánh của mình
  const effectiveBranchId =
    !currentUser.isGlobalManager && currentUser.branchId
      ? currentUser.branchId
      : branchId;

  return {
    ...(staffId ? { createdById: staffId } : {}),
    user: {
      role: { in: roleFilter },
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
  };
}

// ==========================================
// ACTION 1: Lấy danh sách hoạt động
// ==========================================
export async function getStaffActivities(filter: ActivityFilter) {
  const currentUser = await requireAuth();

  const from = filter.dateFrom
    ? new Date(`${filter.dateFrom}T00:00:00.000Z`)
    : new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z");

  const to = filter.dateTo
    ? new Date(`${filter.dateTo}T23:59:59.999Z`)
    : new Date(from.toISOString().split("T")[0] + "T23:59:59.999Z");

  const staffWhere = buildStaffWhere(currentUser, filter);

  return db.leadActivity.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      ...staffWhere,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          branch: { select: { id: true, name: true } },
        },
      },
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          type: true,
          status: true,
        },
      },
      reason: {
        select: { id: true, content: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ==========================================
// ACTION 2: Lấy danh sách nhân viên để filter
// (Nhân viên không cần, chỉ dùng cho Manager)
// ==========================================
export async function getStaffList(
  staffType: "PURCHASE_STAFF" | "SALES_STAFF" | "ALL" = "ALL",
  branchId?: string,
) {
  const currentUser = await requireAuth();

  // Nhân viên không có dropdown chọn người khác
  if (currentUser.isStaff) return [];

  const roleFilter: Role[] = [];
  if (staffType === "PURCHASE_STAFF" || staffType === "ALL")
    roleFilter.push(Role.PURCHASE_STAFF);
  if (staffType === "SALES_STAFF" || staffType === "ALL")
    roleFilter.push(Role.SALES_STAFF);

  const effectiveBranchId =
    !currentUser.isGlobalManager && currentUser.branchId
      ? currentUser.branchId
      : branchId;

  return db.user.findMany({
    where: {
      role: { in: roleFilter },
      active: true,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      branch: { select: { id: true, name: true } },
    },
    orderBy: { fullName: "asc" },
  });
}

// ==========================================
// ACTION 3: Lấy chi nhánh
// ==========================================
export async function getBranches() {
  const currentUser = await requireAuth();

  // Nhân viên không cần filter chi nhánh
  if (currentUser.isStaff) return [];

  if (!currentUser.isGlobalManager && currentUser.branchId) {
    return db.branch.findMany({
      where: { id: currentUser.branchId },
      select: { id: true, name: true },
    });
  }

  return db.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ==========================================
// ACTION 4: Tổng hợp theo nhân viên
// ==========================================
export async function getActivitySummary(filter: ActivityFilter) {
  const currentUser = await requireAuth();

  const from = filter.dateFrom
    ? new Date(`${filter.dateFrom}T00:00:00.000Z`)
    : new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z");

  const to = filter.dateTo
    ? new Date(`${filter.dateTo}T23:59:59.999Z`)
    : new Date(from.toISOString().split("T")[0] + "T23:59:59.999Z");

  const staffWhere = buildStaffWhere(currentUser, filter);

  const grouped = await db.leadActivity.groupBy({
    by: ["createdById"],
    where: {
      createdAt: { gte: from, lte: to },
      ...staffWhere,
    },
    _count: { id: true },
  });

  const userIds = grouped.map((g) => g.createdById);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      branch: { select: { name: true } },
    },
  });

  return grouped.map((g) => ({
    createdById: g.createdById,
    count: g._count.id,
    user: users.find((u) => u.id === g.createdById),
  }));
}

// ==========================================
// ACTION 5: Trả về ngữ cảnh để client biết
// nên hiển thị filter nào
// ==========================================
export async function getActivityPageContext() {
  const currentUser = await requireAuth();

  return {
    isManager: currentUser.isManager,
    isStaff: currentUser.isStaff,
    isGlobalManager: currentUser.isGlobalManager,
    branchId: currentUser.branchId,
    userId: currentUser.id,
    fullName: currentUser.fullName,
  };
}
