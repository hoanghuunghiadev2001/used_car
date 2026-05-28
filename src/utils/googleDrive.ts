export const getDisplayImageUrl = (
  fileInput: string | undefined | null,
  fileName?: string,
): string => {
  if (!fileInput)
    return "https://cdn-icons-png.flaticon.com/512/1091/1091223.png"; // Icon mặc định nếu rỗng

  // 1. TRƯỜNG HỢP GOOGLE DRIVE DẠNG LINK WEB ĐẦY ĐỦ (Ví dụ: https://drive.google.com/file/d/ID_CỦA_FILE/view...)
  // <--- BỔ SUNG ĐOẠN NÀY ĐỂ SỬA LỖI TRÊN
  if (fileInput.includes("drive.google.com")) {
    // Sử dụng Regex để tìm chuỗi ID nằm giữa /d/ và /view (hoặc cuối URL)
    const match = fileInput.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      // Bóc tách được ID thành công, chuyển đổi sang endpoint hiển thị ảnh trực tiếp
      return `https://docs.google.com/thumbnail?sz=s800&id=${match[1]}`;
    }
  }

  // 2. TRƯỜNG HỢP LINK TUYỆT ĐỐI KHÁC (CLOUDINARY / LINK HTTP NGOÀI)
  if (
    fileInput.includes("cloudinary.com") ||
    fileInput.startsWith("http://") ||
    fileInput.startsWith("https://")
  ) {
    return fileInput;
  }

  // 3. TRƯỜNG HỢP FILE LƯU NỘI BỘ (LOCAL SERVER /UPLOADS)
  if (fileInput.startsWith("/uploads") || fileInput.startsWith("uploads/")) {
    return fileInput.startsWith("/") ? fileInput : `/${fileInput}`;
  }

  // 4. XỬ LÝ FILE VĂN PHÒNG (NẾU CÓ ĐUÔI FILE THẬT)
  if (fileName && fileName.includes(".")) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf")
      return "https://cdn-icons-png.flaticon.com/512/337/337946.png";
    if (ext === "xlsx" || ext === "xls")
      return "https://cdn-icons-png.flaticon.com/512/337/337958.png";
    if (ext === "docx" || ext === "doc")
      return "https://cdn-icons-png.flaticon.com/512/337/337932.png";
  }

  // 5. TRƯỜNG HỢP CÒN LẠI: NẾU ĐƯỢC TRUYỀN THẲNG CHUỖI ID FILE DRIVE
  return `https://docs.google.com/thumbnail?sz=s800&id=${fileInput}`;
};
