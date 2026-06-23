/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getReferralTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    SELL: "Bán xe (Khách bán)",
    BUY: "Mua xe (Khách mua)",
    VALUATION: "Định giá xe",
    SELL_TRADE_NEW: "Đổi xe cũ lấy xe MỚI",
    SELL_TRADE_USED: "Đổi xe cũ lấy xe CŨ",
  };
  return labels[type] || type;
};

export function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: any) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 📁 IMAGE UTILITY FUNCTIONS
 * Thay thế Google Drive getDisplayImageUrl
 * Lưu ảnh trực tiếp từ server
 */

// ✅ Hàm 1: Lấy URL display cho ảnh từ server
export const getServerImageUrl = (imageUrl: string): string => {
  // Nếu đã là full URL hoặc relative URL, trả về luôn
  if (!imageUrl) return "";

  // Nếu là relative path (/uploads/...), thêm domain nếu cần
  if (imageUrl.startsWith("/uploads/")) {
    // Local development
    if (typeof window !== "undefined") {
      return imageUrl; // Client-side, relative URL đủ
    }
    // Server-side
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${baseUrl}${imageUrl}`;
  }

  // Nếu đã là full URL
  return imageUrl;
};

// ✅ Hàm 2: Validate file trước khi upload
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateFileBeforeUpload = (file: File): FileValidationResult => {
  const maxSize = parseInt(
    process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE || "10485760",
  );
  const allowedTypes = (
    process.env.NEXT_PUBLIC_ALLOWED_TYPES ||
    "image/jpeg,image/png,image/webp,image/gif,application/pdf"
  ).split(",");

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File quá lớn. Tối đa ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Loại file không được phép. Hỗ trợ: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`,
    };
  }

  return { valid: true };
};

// ✅ Hàm 3: Format file size cho hiển thị
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// ✅ Hàm 4: Kiểm tra file có phải image không
export const isImageFile = (url: string | undefined): boolean => {
  if (!url) return false;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  return imageExtensions.some((ext) => url.toLowerCase().endsWith(ext));
};

// ✅ Hàm 5: Kiểm tra file có phải PDF không
export const isPdfFile = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.toLowerCase().endsWith(".pdf");
};

// ✅ Hàm 6: Extract file name từ URL
export const getFileName = (url: string | undefined): string => {
  if (!url) return "Unknown";
  return url.split("/").pop()?.split("?")[0] || "Unknown";
};

// ✅ Hàm 7: Get file extension
export const getFileExtension = (fileName: string): string => {
  return fileName.split(".").pop()?.toLowerCase() || "";
};

// ✅ Hàm 8: Generate thumbnail URL (tuỳ chọn - cho future use)
export const getThumbnailUrl = (
  imageUrl: string,
  size: "small" | "medium" | "large" = "medium",
): string => {
  const sizeMap = {
    small: "?w=150&h=150&q=80",
    medium: "?w=300&h=300&q=85",
    large: "?w=600&h=600&q=90",
  };

  // Nếu là server URL, có thể thêm query params cho image optimization
  if (imageUrl.includes("/uploads/")) {
    // Future: Có thể integrate với Next.js Image Optimization
    return imageUrl;
  }

  return imageUrl;
};

// ✅ Hàm 9: Build download link
export const getDownloadLink = (fileUrl: string): string => {
  // URL từ server có thể download trực tiếp
  return fileUrl;
};

// ✅ Hàm 10: Convert images array từ JSON
export const parseImageUrls = (
  imageJson: string | null | undefined,
): string[] => {
  if (!imageJson) return [];
  try {
    const parsed = JSON.parse(imageJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ✅ Hàm 11: Convert images array thành JSON
export const stringifyImageUrls = (urls: string[]): string => {
  return JSON.stringify(urls || []);
};

// ✅ Hàm 12: Remove file từ server (gọi API)
export const deleteFileFromServer = async (
  fileName: string,
): Promise<boolean> => {
  try {
    const response = await fetch("/api/uploadFile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName }),
    });

    return response.ok;
  } catch (error) {
    console.error("❌ Error deleting file:", error);
    return false;
  }
};

// ✅ Hàm 13: Upload file tới server
export interface UploadResponse {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

export const uploadFileToServer = async (
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadResponse> => {
  // Validate trước
  const validation = validateFileBeforeUpload(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploadFile", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error };
    }

    const data = await response.json();
    return {
      success: data.success,
      url: data.url,
      fileName: data.fileName,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
};
