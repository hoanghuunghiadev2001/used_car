/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Khởi tạo và xác thực client Google Drive
async function getDriveClient() {
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL; // Đồng nhất biến môi trường với đoạn check bên dưới

  if (!clientEmail || !rawPrivateKey) {
    throw new Error(
      "Thiếu cấu hình GOOGLE_SERVICE_ACCOUNT_EMAIL hoặc GOOGLE_PRIVATE_KEY tại biến môi trường .env",
    );
  }

  // Xử lý làm sạch chuỗi private_key: Khử dấu nháy kép bọc ngoài và phục hồi dấu xuống dòng \n chuẩn
  const formattedPrivateKey = rawPrivateKey
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");

  // Khởi tạo phương thức xác thực JWT
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: formattedPrivateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"], // Đổi sang readonly để tăng tính bảo mật bảo vệ dữ liệu
    // LƯU Ý: Đã bỏ hoàn toàn thuộc tính `subject` để tránh lỗi phân quyền hệ thống "unauthorized_client"
  });

  return google.drive({ version: "v3", auth });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");
    const action = searchParams.get("action") || "view"; // Mặc định là view hoặc download

    if (!fileId) {
      return new NextResponse("Thiếu tham số ID File hợp đồng.", {
        status: 400,
      });
    }

    const drive = await getDriveClient();

    // 1. Lấy thông tin chi tiết (metadata) của file từ Google Drive
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "name, mimeType",
    });

    const fileName = fileMetadata.data.name || "HopDong.pdf";
    const contentType = fileMetadata.data.mimeType || "application/pdf";

    // 2. Tải luồng dữ liệu nhị phân (Buffer) của File dưới dạng arraybuffer
    const driveResponse = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );

    const fileBuffer = Buffer.from(driveResponse.data as ArrayBuffer);

    // 3. Thiết lập Header phản hồi tương ứng dựa theo nhu cầu Xem hay Tải về
    const headers = new Headers();
    headers.set("Content-Type", contentType);

    if (action === "download") {
      // Nếu là tải về: Ép trình duyệt mở hộp thoại lưu tập tin nguyên bản có dấu tiếng Việt mẫu xe/hợp đồng
      const encodedFileName = encodeURIComponent(fileName);
      headers.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodedFileName}`,
      );
    } else {
      // Nếu là xem: Hiển thị trực tiếp (inline) trong khung iframe Antd của frontend
      headers.set("Content-Disposition", "inline");
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error: any) {
    console.error("Lỗi API kết nối Google Drive:", error);
    return new NextResponse(
      `Không thể truy cập tệp tin trên Google Drive. Chi tiết: ${error.message || error}`,
      { status: 500 },
    );
  }
}
