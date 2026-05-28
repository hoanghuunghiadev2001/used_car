/* eslint-disable react/display-name */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo } from "react"; // 1. Import memo
import {
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { Image, Empty, Typography } from "antd";

const { Text } = Typography;

/* ================== HELPERS ================== */
const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

const getFileName = (url: string) => {
  try {
    return decodeURIComponent(url.split("/").pop() || "file");
  } catch {
    return "file";
  }
};

const getFileIcon = (url: string) => {
  if (/\.pdf$/i.test(url))
    return <FilePdfOutlined style={{ fontSize: 24, color: "#ef4444" }} />;
  if (/\.(doc|docx)$/i.test(url))
    return <FileWordOutlined style={{ fontSize: 24, color: "#2563eb" }} />;
  if (/\.(xls|xlsx)$/i.test(url))
    return <FileExcelOutlined style={{ fontSize: 24, color: "#16a34a" }} />;
  return <FileOutlined style={{ fontSize: 24 }} />;
};

/* ================== COMPONENT ================== */
interface DocumentViewerProps {
  files: any[];
}

// 2. Bọc Component trong memo
const DocumentViewer: React.FC<DocumentViewerProps> = memo(({ files }) => {
  if (!files || files.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ" />
    );
  }

  return (
    // 3. Sử dụng style GPU acceleration ở container
    <div
      className="grid grid-cols-3 gap-3 w-full"
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    >
      <Image.PreviewGroup>
        {files.map((file: any, index: number) => {
          const url = file.url;
          const isImage = isImageFile(url);

          return (
            <div key={file.uid || index} className="flex flex-col items-center">
              <div className="w-full h-[80px] relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                {isImage ? (
                  <Image
                    loading="lazy"
                    width="100%"
                    height={80}
                    src={getDisplayImageUrl(url, getFileName(url))}
                    preview={true} // Chỉ cho phép preview nếu là ảnh
                    className="object-cover transition-opacity duration-300"
                    // Hiển thị khung loading giả để mượt hơn khi scroll
                    placeholder={
                      <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center">
                        <PictureOutlined className="text-slate-400" />
                      </div>
                    }
                    fallback="/img/no-image.png"
                  />
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-blue-500 bg-white"
                  >
                    {getFileIcon(url)}
                    <span className="text-[9px] mt-1 truncate w-full text-center px-2">
                      {getFileName(url)}
                    </span>
                  </a>
                )}
              </div>

              <Text className="text-[10px] mt-1 text-slate-400 truncate w-full text-center">
                Tài liệu {index + 1}
              </Text>
            </div>
          );
        })}
      </Image.PreviewGroup>
    </div>
  );
});

// Thêm icon để dùng trong placeholder
import { PictureOutlined } from "@ant-design/icons";
import { getDisplayImageUrl } from "@/utils/googleDrive";

export default DocumentViewer;
