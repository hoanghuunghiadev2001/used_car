/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1️⃣ Khởi tạo S3 Client kết nối tới Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// ✅ Sanitize filename - xóa ký tự nguy hiểm, xóa dấu tiếng Việt
function sanitizeFileName(fileName: string): string {
  if (!fileName) return `file-${Date.now()}`;

  const lastDotIndex = fileName.lastIndexOf(".");
  let name =
    lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : ".jpg";

  name = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .toLowerCase();

  name = name.substring(0, 50);

  return `${Date.now()}-${name}${ext}`;
}

// 2️⃣ ✅ API POST: Tạo Presigned URL để client tự upload lên R2
export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await req.json();

    // Validate đầu vào dữ liệu cơ bản
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu thông tin file (fileName, fileType, fileSize)",
        },
        { status: 400 },
      );
    }

    // Validate kích thước file
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File quá lớn. Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Validate định dạng file
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: "Chỉ hỗ trợ JPG, PNG, WebP, GIF, PDF" },
        { status: 400 },
      );
    }

    const safeFileName = sanitizeFileName(fileName);

    // Cấu hình lệnh put đối tượng lên R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: safeFileName,
      ContentType: fileType,
    });

    // Tạo link upload tạm thời có hiệu lực trong 5 phút (300 giây)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Đường dẫn public cuối cùng của file để lưu vào Database
    const finalFileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${safeFileName}`;

    return NextResponse.json(
      {
        success: true,
        uploadUrl, // Frontend dùng link này để PUT file lên
        url: finalFileUrl, // URL này lưu vào Database và hiển thị cho người dùng
        fileName: safeFileName,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("❌ R2 Upload Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi server khi tạo link upload",
      },
      { status: 500 },
    );
  }
}

// 3️⃣ ✅ API DELETE: Xóa trực tiếp file trên Cloudflare R2
export async function DELETE(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "Cần cung cấp tên file để xóa" },
        { status: 400 },
      );
    }

    // Trích xuất lấy tên file chuẩn (phòng hờ trường hợp client truyền cả URL dài vào)
    const key = fileName.includes("/") ? fileName.split("/").pop() : fileName;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Tên file không hợp lệ" },
        { status: 400 },
      );
    }

    // Tạo lệnh xóa đối tượng trên R2
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // Gửi yêu cầu xóa lên Cloudflare R2
    await s3Client.send(command);

    console.log(`✅ File deleted from R2: ${key}`);

    return NextResponse.json({
      success: true,
      message: "File đã được xóa thành công khỏi Cloudflare R2",
    });
  } catch (error: any) {
    console.error("❌ R2 Delete Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi khi xóa file trên hệ thống Cloud",
      },
      { status: 500 },
    );
  }
}
