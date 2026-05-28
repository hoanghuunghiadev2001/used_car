import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// Hàm chuyển đổi tiếng Việt có dấu thành không dấu và xóa ký tự đặc biệt
function removeVietnameseTones(str: string) {
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  str = str.replace(/[đĐ]/g, "d");
  return str
    .replace(/[^a-zA-Z0-9.\-_]/g, "-") // Thay ký tự đặc biệt bằng "-"
    .replace(/-+/g, "-") // Sửa trường hợp nhiều dấu "-" liên tiếp
    .toLowerCase();
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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

    // 1. Validate dung lượng file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Kích thước file vượt quá giới hạn cho phép (10MB)" },
        { status: 400 },
      );
    }

    // 2. Validate định dạng file
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Định dạng file không được hỗ trợ" },
        { status: 400 },
      );
    }

    // 3. Đọc dữ liệu file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Chuẩn hóa tên file an toàn (Không dấu, không khoảng trắng)
    const baseName = path.basename(file.name, ext);
    const safeBaseName = removeVietnameseTones(baseName);
    const safeFileName = `${Date.now()}-${safeBaseName}${ext}`;

    // 5. Định nghĩa đường dẫn lưu file
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "contracts",
    );
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeFileName);

    // 6. Ghi file xuống ổ đĩa
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/contracts/${safeFileName}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Lỗi Server Upload:", error);
    return NextResponse.json(
      { error: "Lỗi xử lý file trên server" },
      { status: 500 },
    );
  }
}
