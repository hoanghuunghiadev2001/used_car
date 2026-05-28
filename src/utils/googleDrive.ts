/* eslint-disable @typescript-eslint/no-unused-vars */
export const getDisplayImageUrl = (
  fileInput: string | undefined | null,
  fileName?: string,
): string => {
  if (!fileInput)
    return "https://cdn-icons-png.flaticon.com/512/1091/1091223.png";

  // 1. ƯU TIÊN KIỂM TRA ĐƯỜNG DẪN LOCAL (Đã xác định qua log của bạn)
  // Nếu bắt đầu bằng /uploads, trả về nguyên trạng để trình duyệt tự load
  if (fileInput.startsWith("/uploads") || fileInput.startsWith("uploads/")) {
    return fileInput.startsWith("/") ? fileInput : `/${fileInput}`;
  }

  // 2. TRƯỜNG HỢP GOOGLE DRIVE (ID thuần)
  // ID Drive thường dài, không chứa dấu /
  if (fileInput.length > 20 && !fileInput.includes("/")) {
    return `/api/contract-file?id=${fileInput}&action=view`;
  }

  // 3. TRƯỜNG HỢP GOOGLE DRIVE (Link đầy đủ)
  if (fileInput.includes("drive.google.com")) {
    const match = fileInput.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      return `/api/contract-file?id=${match[1]}&action=view`;
    }
  }

  // 4. Các link HTTP khác
  if (fileInput.startsWith("http")) return fileInput;

  return fileInput;
};
