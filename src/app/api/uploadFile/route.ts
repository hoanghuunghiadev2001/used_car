import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

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

    // 1. Đọc dữ liệu file dưới dạng Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Tạo tên file duy nhất để tránh trùng lặp (ví dụ: 1716712345678-hop-dong.pdf)
    const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    // 3. Định nghĩa đường dẫn lưu file trong thư mục public
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "contracts",
    );

    // Đảm bảo thư mục tồn tại, nếu chưa có thì tự động tạo
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeFileName);

    // 4. Ghi file xuống ổ đĩa của server
    await fs.writeFile(filePath, buffer);

    // 5. Trả về đường dẫn tĩnh có thể truy cập công khai từ client
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
