/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const APP_NAME = "used-car";

// 🔐 ĐỊNH NGHĨA QUYỀN TRUY CẬP DỰA TRÊN SIDEBAR
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // --- NHÂN SỰ & HỆ THỐNG ---
  "/dashboard/staff-dashboard": ["SALES_STAFF", "PURCHASE_STAFF"],

  "/dashboard/users": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],
  "/dashboard/settings": ["ADMIN"], // isGlobal check thêm ở UI

  // --- QUẢN TRỊ VẬN HÀNH (ADMIN/MANAGER),"ADMIN_MANAGER" ---
  "/dashboard/customers": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],
  "/dashboard/lead": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],
  "/dashboard/late-kpi-report": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],
  "/dashboard/cars": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],
  "/dashboard/admin/approval-customer": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],
  "/dashboard/inventory-report": ["ADMIN", "MANAGER", "ADMIN_MANAGER"],

  // --- NGHIỆP VỤ SALE ---
  "/dashboard/sales-inventory": ["ADMIN", "SALES_STAFF"],
  "/dashboard/contract-sales": ["ADMIN", "SALES_STAFF"],
  "/dashboard/sales/history": ["ADMIN", "SALES_STAFF"],

  // --- NGHIỆP VỤ THU MUA ---
  "/dashboard/assigned-tasks": ["ADMIN", "PURCHASE_STAFF", "APPRAISER"],
  "/dashboard/contract-purchase": ["ADMIN", "PURCHASE_STAFF"],
  "/dashboard/purchase/history": ["ADMIN", "PURCHASE_STAFF"],
  "/dashboard/new-car-inbound": ["ADMIN", "SALE_MANAGER", "MANAGER"],
  "/dashboard/new-car-report": ["ADMIN"],

  // Nếu bạn có trang chi tiết theo ID (ví dụ dynamic route)
  "/dashboard/new-car-inbound/": ["ADMIN"], // prefix cho [id]

  // --- GIỚI THIỆU KHÁCH & CHUNG ---
  "/dashboard/staff-activities": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
    "REFERRER",
    "MARKETING",
    "SALE_MANAGER",
  ],
  "/dashboard/referrals/new": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
    "REFERRER",
    "MARKETING",
    "SALE_MANAGER",
  ],

  "/dashboard/marketing/listcustomer": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALE_MANAGER",
    "MARKETING",
  ],

  "/dashboard/customer-actioned": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
  ],
  "/dashboard/my-referrals": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
    "REFERRER",
    "MARKETING",
    "SALE_MANAGER",
  ],
  "/dashboard/showroom": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
    "REFERRER",
    "MARKETING",
    "SALE_MANAGER",
  ],
  "/dashboard/profile": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
    "REFERRER",
    "MARKETING",
    "SALE_MANAGER",
  ],
  "/dashboard/schedules": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
    "REFERRER",
    "MARKETING",
    "SALE_MANAGER",
  ],

  // --- TRANG CHỦ & HỢP ĐỒNG DÙNG CHUNG ---

  "/dashboard/contract": ["ADMIN", "MANAGER", "SALES_STAFF", "PURCHASE_STAFF"],
  "/": [
    "ADMIN",
    "MANAGER",
    "ADMIN_MANAGER",
    "SALES_STAFF",
    "PURCHASE_STAFF",
    "APPRAISER",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Public routes
  const isPublic = [
    "/login",
    "/api",
    "/_next",
    "/favicon",
    "/robots",
    "/manifest",
    "/register",
    "/storage",
    "/403",
  ].some((path) => pathname.startsWith(path));

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get("used-car")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.appName !== APP_NAME)
      return NextResponse.redirect(new URL("/login", req.url));

    const userRole = (payload.role as string) || "";

    // 🚀 LOGIC ĐIỀU HƯỚNG THEO ROLE KHI TRUY CẬP TRANG CHỦ HOẶC VỪA ĐĂNG NHẬP
    // 🚀 LOGIC ĐIỀU HƯỚNG THEO ROLE
    if (pathname === "/" || pathname === "/dashboard") {
      // 1. Nếu là Admin hoặc Quản lý: Cho phép truy cập tiếp (giữ nguyên tại "/")
      const isAdminOrManager = ["ADMIN", "MANAGER", "ADMIN_MANAGER"].includes(
        userRole,
      );
      if (isAdminOrManager) {
        return NextResponse.next();
      }

      // 2. Nếu là Nhân viên nghiệp vụ: Chuyển đến staff-dashboard
      if (userRole === "SALES_STAFF" || userRole === "PURCHASE_STAFF") {
        return NextResponse.redirect(
          new URL("/dashboard/staff-dashboard", req.url),
        );
      }

      // 3. Đối với các Role khác (REFERRER..
      // "MARKETING",.)
      // Redirect to referrals page for other roles
      return NextResponse.redirect(
        new URL("/dashboard/referrals/new", req.url),
      );
    }

    // 🛡️ 2. KIỂM TRA PHÂN QUYỀN CHẶN URL (RBAC)
    const sortedRoutes = Object.keys(ROLE_PERMISSIONS).sort(
      (a, b) => b.length - a.length,
    );

    for (const route of sortedRoutes) {
      const isMatch =
        route === "/" ? pathname === "/" : pathname.startsWith(route);

      if (isMatch) {
        const allowedRoles = ROLE_PERMISSIONS[route];
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL("/403", req.url));
        }
        break;
      }
    }

    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
