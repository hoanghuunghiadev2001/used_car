/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/auth.ts
import { db } from "./db";
import { apiRequest } from "./api";
import { jwtVerify } from "jose";

// ✅ SỬA TẠI ĐÂY: Chuyển string sang Uint8Array
const JWT_SECRET_STR = process.env.JWT_SECRET || "super-secret-key";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

const APP_NAME = "used-car";

// Khai báo Interface chuẩn
export interface TokenPayload {
  id: string;
  role: string;
  username: string;
  appName: string;
  version: number;
}

export async function login(username: string, password: string) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });
}

export async function logout() {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function getUserFromToken(token: string) {
  try {
    // 1. Giải mã bằng jose
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const data = payload as unknown as TokenPayload;

    // 2. Kiểm tra định danh App
    if (data.appName !== APP_NAME) {
      console.warn("🚩 Auth Fail: App Name mismatch");
      return null;
    }

    // 3. Lấy thông tin user từ DB
    const user = await db.user.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        fullName: true,
        isGlobalManager: true,
        branchId: true,
        tokenVersion: true,
        email: true,
        departmentId: true, // <-- ADD THIS
      },
    });

    // 4. Kiểm tra tài khoản
    if (!user || !user.active) {
      console.warn("🚩 Auth Fail: User inactive or deleted");
      return null;
    }

    // 5. Kiểm tra Version (Đổi mật khẩu thì văng)
    if (data.version !== user.tokenVersion) {
      console.warn("🚩 Auth Fail: Token version outdated (Security Reset)");
      return null;
    }

    return user;
  } catch (err) {
    console.error(
      "🚩 Auth Fail: Invalid token signature, expired or secret mismatch",
    );
    return null;
  }
}
