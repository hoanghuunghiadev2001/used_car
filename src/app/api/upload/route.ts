/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Cấu hình
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
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

  // Tách extension
  const lastDotIndex = fileName.lastIndexOf(".");
  let name =
    lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : ".jpg";

  // Xóa dấu tiếng Việt
  name = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .toLowerCase();

  // Giới hạn độ dài
  name = name.substring(0, 50);

  return `${Date.now()}-${name}${ext}`;
}

// ✅ Tạo thư mục nếu chưa tồn tại
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`✅ Created upload directory: ${UPLOAD_DIR}`);
  }
}

// ✅ Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  // Kiểm tra kích thước
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File quá lớn. Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Kiểm tra loại file
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Chỉ hỗ trợ JPG, PNG, WebP, GIF, PDF",
    };
  }

  return { valid: true };
}

// ✅ Main handler
export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy file" },
        { status: 400 },
      );
    }

    // 2️⃣ Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    // 3️⃣ Tạo thư mục uploads nếu chưa có
    await ensureUploadDir();

    // 4️⃣ Sanitize filename
    const safeFileName = sanitizeFileName(file.name);
    const filePath = path.join(UPLOAD_DIR, safeFileName);

    // 5️⃣ Chuyển file thành Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6️⃣ Lưu file vào đĩa
    await writeFile(filePath, buffer);

    // 7️⃣ Tạo URL trả về (relative path)
    const fileUrl = `/uploads/${safeFileName}`;

    console.log(`✅ File saved: ${safeFileName} → ${filePath}`);

    return NextResponse.json(
      {
        success: true,
        url: fileUrl, // URL này sẽ được form sử dụng
        fileName: safeFileName,
        fileSize: file.size,
        mimeType: file.type,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Lỗi server khi lưu file",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "Cần cung cấp tên file" },
        { status: 400 },
      );
    }

    // ⚠️ Security: Chỉ cho phép xóa file trong upload dir
    const filePath = path.join(UPLOAD_DIR, path.basename(fileName));

    // Đảm bảo file nằm trong UPLOAD_DIR
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { success: false, error: "Không hợp lệ" },
        { status: 400 },
      );
    }

    if (existsSync(filePath)) {
      // Sẽ implement xóa file sau
      console.log(`File would be deleted: ${filePath}`);
    }

    return NextResponse.json({
      success: true,
      message: "File deleted",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
