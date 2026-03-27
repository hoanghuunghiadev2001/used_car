/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail-service";
import { newUserRegistrationEmailTemplate } from "@/lib/mail-templates";
import { getCurrentUser } from "@/lib/session-server";
import bcrypt from "bcryptjs";

export async function getCurrentUserAction() {
  try {
    const auth = await getCurrentUser();
    if (!auth) throw new Error("Bạn cần đăng nhập để thực hiện hành động này");

    const user = await db.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        fullName: true,
        role: true, // Lấy role: SALES_STAFF, PURCHASE_STAFF, v.v.
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user session:", error);
    return null;
  }
}

export async function registerAction(data: any) {
  try {
    const { username, fullName, email, password, phone, branchId } = data;

    // 1. Kiểm tra tồn tại
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    const recentRegistration = await db.user.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { phone: phone }],
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Trong 5 phút qua
      },
    });

    if (recentRegistration) {
      throw new Error("Thao tác quá nhanh. Vui lòng thử lại sau vài phút.");
    }

    if (existingUser) {
      throw new Error("Mã nhân viên hoặc Email đã tồn tại trong hệ thống.");
    }

    // 2. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Lấy thông tin chi nhánh để hiển thị trong Email
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });

    // 4. Tạo User mới (mặc định active = false để chờ duyệt)
    const newUser = await db.user.create({
      data: {
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        phone,
        branchId,
        role: "REFERRER",
        active: false,
      },
    });

    const admins = await db.user.findMany({
      where: {
        OR: [{ role: "ADMIN" }, { isGlobalManager: true }],
        active: true, // Chỉ gửi cho admin đang hoạt động
      },
      select: { email: true },
    });

    const adminEmails = admins.map((a) => a.email);

    // 5. Gửi email thông báo
    if (adminEmails.length > 0) {
      try {
        const emailHtml = newUserRegistrationEmailTemplate({
          fullName: newUser.fullName ?? "",
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone ?? "",
          branchName: branch?.name || "Chưa xác định",
        });

        await sendMail({
          to: adminEmails, // Nodemailer hỗ trợ truyền một mảng string email
          subject: `[NHÂN VIÊN ĐĂNG KÝ MỚI]`,
          html: emailHtml,
        });
      } catch (mailError) {
        console.error("Lỗi gửi email cho danh sách Admin:", mailError);
      }
    }

    return {
      success: true,
      message:
        "Đăng ký thành công. Đã gửi thông báo cho các quản trị viên phê duyệt.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
