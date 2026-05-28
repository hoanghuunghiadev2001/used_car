/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";

// Hàm xóa dấu tiếng Việt và ký tự đặc biệt để tên file không bị lỗi hiển thị
function removeVietnameseTones(str: string) {
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  str = str.replace(/[đĐ]/g, "d");
  return str
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Giới hạn 10MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp tin" },
        { status: 400 },
      );
    }

    // 1. Kiểm tra dung lượng và định dạng file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Kích thước file vượt quá giới hạn 10MB" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Định dạng file không được hỗ trợ" },
        { status: 400 },
      );
    }

    // 2. Chuyển đổi dữ liệu File thành Buffer để xử lý trên RAM
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Chuẩn hóa tên file sạch để lưu trữ
    const baseName = path.basename(file.name, ext);
    const safeFileName = `${Date.now()}-${removeVietnameseTones(baseName)}${ext}`;

    // 4. BẪY DEBUG & LÀM SẠCH BIẾN MÔI TRƯỜNG
    const rawFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log("\n====== 🛡️ GOOGLE DRIVE SYSTEM DEBUG ======");
    console.log(
      "-> Độ dài ID nhận được:",
      rawFolderId ? rawFolderId.length : 0,
      "ký tự",
    );
    console.log("-> Cấu trúc JSON của ID:", JSON.stringify(rawFolderId));
    console.log(
      "-> Email Service Account đang chạy:",
      process.env.GOOGLE_CLIENT_EMAIL,
    );
    console.log("===========================================\n");

    // Xử lý khoảng trắng, tab, xuống dòng phát sinh từ môi trường Windows Server
    const cleanFolderId = rawFolderId
      ? rawFolderId.replace(/[\r\n\t]/g, "").trim()
      : "";

    if (!cleanFolderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID bị rỗng hoặc không hợp lệ.");
    }

    // Thay thế ký tự xuống dòng tránh lỗi định dạng chuỗi từ biến môi trường
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    // 5. Biến đổi Buffer thành luồng đọc (Readable Stream) phù hợp với Drive API
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    // 6. Đẩy file lên Google Drive dưới quyền tạm thời của Bot
    const driveResponse = await drive.files.create({
      requestBody: {
        name: safeFileName,
        parents: [cleanFolderId],
      },
      media: {
        mimeType: file.type,
        body: bufferStream,
      },
      supportsAllDrives: true,
      fields: "id, webViewLink, webContentLink",
    } as any);

    const driveFile = driveResponse.data;

    // 7. 🔥 CHUYỂN GIAO QUYỀN SỞ HỮU ĐỂ SỬ DỤNG QUOTA CỦA USER MÌNH
    // Con bot sau khi tạo xong file sẽ chuyển 'owner' sang cho email doanh nghiệp của bạn.
    // Việc này đẩy quota tính dung lượng file từ Bot (0MB) sang tài khoản của bạn.
    if (driveFile.id) {
      try {
        await drive.permissions.create({
          fileId: driveFile.id,
          requestBody: {
            type: "user",
            role: "owner", // Đặt làm chủ sở hữu file
            emailAddress: "nghia.hh@toyotabinhduong.com.vn", // Chính xác email nhận chủ quyền trong ảnh
          },
          transferOwnership: true, // Bắt buộc tham số này để đổi chủ sở hữu
          moveToNewOwnersRoot: false, // Giữ nguyên vị trí file trong thư mục hiện tại, không chuyển về Root của User
          supportsAllDrives: true,
        } as any);
        console.log(
          `➡️ Đã chuyển giao thành công quyền sở hữu file ${driveFile.id} về tài khoản cá nhân.`,
        );
      } catch (permError: any) {
        console.error(
          "⚠️ Cảnh báo lỗi phân quyền Transfer Ownership:",
          permError.message,
        );
        // Nếu lỗi phân quyền xảy ra, không làm sập luồng chính, vẫn cố gắng trả về file id nếu có thể
      }
    }

    // Trả về kết quả thành công cho client
    return NextResponse.json({
      success: true,
      fileId: driveFile.id,
      url: driveFile.webViewLink,
      downloadUrl: driveFile.webContentLink,
    });
  } catch (error: any) {
    console.error("🔥 Lỗi Upload Hệ Thống Google Drive:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý hệ thống upload" },
      { status: 500 },
    );
  }
}
