/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1️⃣ Khởi tạo cấu hình S3 Client kết nối Cloudflare R2
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

// ✅ Sanitize filename - dọn dẹp tên file, xóa dấu tiếng Việt an toàn
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

// 2️⃣ ✅ API POST: Cấp Presigned URL (Vé thông hành để Client tự upload lên R2)
export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await req.json();

    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu thông tin file (fileName, fileType, fileSize)",
        },
        { status: 400 },
      );
    }

    // Rào kiểm tra kích thước file
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File quá lớn. Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Rào kiểm tra định dạng file
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: "Chỉ hỗ trợ JPG, PNG, WebP, GIF, PDF" },
        { status: 400 },
      );
    }

    const safeFileName = sanitizeFileName(fileName);

    // Cấu hình lệnh chuẩn bị đẩy object lên Cloudflare
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: safeFileName,
      ContentType: fileType,
    });

    // Tạo link upload mã hóa có hiệu lực trong 5 phút (300 giây)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Đường dẫn public cuối cùng phục vụ việc hiển thị và lưu vào DB của bạn
    const finalFileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${safeFileName}`;

    return NextResponse.json(
      {
        success: true,
        uploadUrl, // Trình duyệt sẽ dùng link này thực hiện method PUT để đẩy file lên R2
        url: finalFileUrl, // URL này bạn lưu xuống DB của dự án (ví dụ MySQL/PostgreSQL)
        fileName: safeFileName,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("❌ R2 Presigned URL Generation Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi máy chủ khi khởi tạo tiến trình upload",
      },
      { status: 500 },
    );
  }
}

// 3️⃣ ✅ API DELETE: Xóa file trực tiếp khỏi hệ thống lưu trữ Cloudflare R2
export async function DELETE(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "Cần cung cấp tên hoặc URL của file để xóa" },
        { status: 400 },
      );
    }

    // Trường hợp Client truyền vào nguyên cái URL dài dạng "https://pub-xxx.r2.dev/172000-image.jpg"
    // Hàm này sẽ tự động cắt ra để chỉ lấy đúng cái tên file gốc "172000-image.jpg"
    const key = fileName.includes("/") ? fileName.split("/").pop() : fileName;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Tên file không hợp lệ" },
        { status: 400 },
      );
    }

    // Cấu hình lệnh xóa object trên bucket
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // Thực thi lệnh xóa lên Cloudflare
    await s3Client.send(command);

    console.log(`✅ File permanently deleted from R2: ${key}`);

    return NextResponse.json({
      success: true,
      message: "File đã được xóa hoàn toàn trên Cloudflare R2",
    });
  } catch (error: any) {
    console.error("❌ R2 Object Deletion Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi hệ thống khi thực hiện lệnh xóa file",
      },
      { status: 500 },
    );
  }
}
