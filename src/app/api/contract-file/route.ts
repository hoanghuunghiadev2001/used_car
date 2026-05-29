/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";

// Hàm làm sạch tên file
function removeVietnameseTones(str: string) {
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return str.replace(/[^a-zA-Z0-9.\-_]/g, "-").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json(
        { error: "Không tìm thấy file" },
        { status: 400 },
      );

    // 1. Cấu hình OAuth2 Client (Sử dụng Refresh Token để lấy quyền vĩnh viễn)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 2. Chuẩn bị Buffer và tên file
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${Date.now()}-${removeVietnameseTones(path.basename(file.name))}`;

    // 3. Upload file (Dùng OAuth2 không bị giới hạn Quota như Service Account)
    const driveResponse = await drive.files.create({
      requestBody: {
        name: safeFileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID as string],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id, webViewLink",
    });

    return NextResponse.json({
      success: true,
      fileId: driveResponse.data.id,
      url: driveResponse.data.webViewLink,
    });
  } catch (error: any) {
    console.error("🔥 Lỗi Upload OAuth2:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi hệ thống khi upload" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");
    if (!fileId) return new NextResponse("Thiếu ID", { status: 400 });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID2,
      process.env.GOOGLE_CLIENT_SECRET2,
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN2,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Lấy thông tin tệp
    const meta = await drive.files.get({ fileId, fields: "mimeType" });
    // Tải dữ liệu ảnh
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );

    return new NextResponse(Buffer.from(response.data as ArrayBuffer), {
      headers: { "Content-Type": meta.data.mimeType as string },
    });
  } catch (error) {
    return new NextResponse("Không thể tải ảnh", { status: 500 });
  }
}
