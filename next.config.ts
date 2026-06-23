// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Hỗ trợ file tĩnh từ public
  staticFileGlobPatterns: ["public/**/*"],

  // ✅ Nếu cần tăng limit body size cho upload lớn
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 60 seconds
    pagesBufferLength: 5,
  },

  // ✅ Webpack config nếu cần
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
