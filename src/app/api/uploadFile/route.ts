/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";

// Hàm xóa dấu tiếng Việt và ký tự đặc biệt để tên file sạch, không lỗi hiển thị
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

    // 3. Chuẩn hóa tên file để lưu trữ an toàn
    const baseName = path.basename(file.name, ext);
    const safeFileName = `${Date.now()}-${removeVietnameseTones(baseName)}${ext}`;

    // 4. LÀM SẠCH BIẾN MÔI TRƯỜNG FOLDER ID (Tránh dính ký tự ẩn ẩn từ Windows Server)
    const rawFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const cleanFolderId = rawFolderId
      ? rawFolderId.replace(/[\r\n\t]/g, "").trim()
      : "";

    if (!cleanFolderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID trong file .env bị rỗng.");
    }

    // 5. CẤU HÌNH XÁC THỰC OAUTH2 ĐỂ SỬ DỤNG QUOTA CỦA USER MÌNH
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    // Truyền mã Refresh Token vĩnh viễn đã lấy từ Playground vào đây
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 6. Biến đổi Buffer thành luồng đọc (Readable Stream) chuẩn hóa cho Drive API
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null); // Đóng luồng dữ liệu

    // 7. Thực hiện đẩy file thẳng lên Google Drive
    // Do chạy bằng OAuth2 chính chủ nên không cần gán 'supportsAllDrives' hay 'transferOwnership' phức tạp nữa
    const driveResponse = await drive.files.create({
      requestBody: {
        name: safeFileName,
        parents: [cleanFolderId],
      },
      media: {
        mimeType: file.type,
        body: bufferStream,
      },
      fields: "id, webViewLink, webContentLink",
    });

    const driveFile = driveResponse.data;

    // Trả về kết quả thành công cho client
    return NextResponse.json({
      success: true,
      fileId: driveFile.id,
      url: driveFile.webViewLink, // Link xem trực tuyến trên Drive
      downloadUrl: driveFile.webContentLink, // Link click tải trực tiếp file về máy
    });
  } catch (error: any) {
    console.error("🔥 Lỗi Upload Hệ Thống Google Drive (OAuth2):", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý hệ thống upload" },
      { status: 500 },
    );
  }
}
