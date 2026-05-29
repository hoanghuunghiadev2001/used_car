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
      return NextResponse.json({ error: "Thiếu file" }, { status: 400 });

    // 1. Cấu hình OAuth2 Client (Sử dụng thông tin OAuth2 bạn đã cung cấp)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID2,
      process.env.GOOGLE_CLIENT_SECRET2,
      "https://developers.google.com/oauthplayground", // Redirect URI chuẩn của playground
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN2,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 2. Chuẩn bị Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = `${Date.now()}-${removeVietnameseTones(path.basename(file.name))}`;

    // 3. Upload file
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
