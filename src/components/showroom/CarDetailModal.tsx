/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React from "react";
import {
  Modal,
  Tag,
  Typography,
  Row,
  Col,
  Divider,
  Descriptions,
  Image,
  Space,
  Button,
  Badge,
  Card,
} from "antd";
import {
  DashboardOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  BgColorsOutlined,
  UserOutlined,
  AuditOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  PlayCircleOutlined,
  CarryOutOutlined,
} from "@ant-design/icons";
import { getDisplayImageUrl } from "@/utils/googleDrive";

const { Title, Text, Paragraph } = Typography;

interface CarDetailModalProps {
  car: any;
  visible: boolean;
  onClose: () => void;
  statusConfig: any;
}

export default function CarDetailModal({
  car,
  visible,
  onClose,
  statusConfig,
}: CarDetailModalProps) {
  if (!car) return null;

  // Helper để hiển thị label cho Enum
  const getFuelLabel = (f: string) =>
    ({ GASOLINE: "Xăng", DIESEL: "Dầu", HYBRID: "Hybrid", ELECTRIC: "Điện" })[
      f
    ] || f;
  const getTransLabel = (t: string) =>
    ({ MANUAL: "Số sàn", AUTOMATIC: "Số tự động", CVT: "Vô cấp" })[t] || t;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1100}
      centered
      style={{ padding: 0, overflow: "hidden", borderRadius: "16px" }}
      closeIcon={
        <div className="bg-white/90 p-2 rounded-full shadow-md hover:rotate-90 transition-transform">
          <SettingOutlined />
        </div>
      }
    >
      <div className="max-h-[90vh] overflow-y-auto w-full! overflow-x-hidden">
        {/* SECTION 1: VISUAL HEADER (Ảnh và Tên xe) */}
        <div className="relative bg-slate-900 h-[200px] rounded-2xl">
          {car.images && car.images.length > 0 ? (
            <Image.PreviewGroup>
              <div className="flex h-full w-full">
                <div className="w-2/3 h-full p-1">
                  <Image
                    src={getDisplayImageUrl(car.images[0])}
                    className="object-cover w-full! h-full rounded-l-lg"
                    alt="Main"
                    style={{ height: "192px", width: "100%" }}
                  />
                </div>
                {car.images.length > 0 && (
                  <div className="w-1/3! h-full flex flex-col gap-1 p-1 pl-0">
                    {car.images.slice(1).map((img: string, i: number) => (
                      <div
                        key={i}
                        className={`${i > 1 ? "hidden! " : i} h-1/2 w-full  `}
                      >
                        <Image
                          src={getDisplayImageUrl(img)}
                          className="object-cover w-full! h-full! rounded-r-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Image.PreviewGroup>
          ) : (
            <div className="h-full flex items-center justify-center text-white">
              Chưa có hình ảnh
            </div>
          )}

          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[18px] text-white font-mono tracking-wider">
            #{car.stockCode}
          </div>

          {/* Badge Trạng thái nổi trên ảnh */}
        </div>

        <div className="p-8 bg-white">
          <div className=" flex gap-2">
            <Tag
              color={statusConfig[car.status]?.color}
              className="m-0 px-4 py-1 text-sm font-bold border-none uppercase shadow-lg"
            >
              {statusConfig[car.status]?.label}
            </Tag>
            {car.isPromoted && (
              <Tag
                color="volcano"
                className="m-0 px-4 py-1 text-sm font-bold border-none shadow-lg animate-pulse"
              >
                ƯU ĐÃI ĐẶC BIỆT
              </Tag>
            )}
          </div>
          {/* SECTION 2: THÔNG TIN CHÍNH */}
          <Row gutter={32}>
            <Col xs={24} lg={16}>
              <div className="mb-6">
                <Space align="baseline">
                  <Title level={2} className="!mb-0">
                    {car.modelName}
                  </Title>
                  <Text className="bg-slate-100 px-3 py-1 rounded text-slate-500 font-mono text-lg">
                    {car.licensePlate}
                  </Text>
                </Space>
                <div className="mt-2 flex gap-4 text-slate-400">
                  <span>
                    <AuditOutlined /> VIN:{" "}
                    <Text copyable className="font-mono text-slate-500">
                      {car.vin}
                    </Text>
                  </span>
                  <span>
                    <EnvironmentOutlined /> {car.branch?.name}
                  </span>
                </div>
              </div>

              {/* Tóm tắt thông số (Icon Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    icon: <CalendarOutlined />,
                    label: "Năm SX",
                    value: car.year,
                  },
                  {
                    icon: <DashboardOutlined />,
                    label: "Odo",
                    value: `${car.odo?.toLocaleString()} km`,
                  },
                  {
                    icon: <ThunderboltOutlined />,
                    label: "Hộp số",
                    value: getTransLabel(car.transmission),
                  },
                  {
                    icon: <BgColorsOutlined />,
                    label: "Nhiên liệu",
                    value: getFuelLabel(car.fuelType),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center"
                  >
                    <div className="text-indigo-500 text-xl mb-1">
                      {item.icon}
                    </div>
                    <div className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                      {item.label}
                    </div>
                    <div className="text-slate-700 font-bold">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* SECTION 3: THÔNG SỐ KỸ THUẬT CHI TIẾT */}
              <Title level={4} className="flex items-center gap-2">
                <SettingOutlined /> Thông số kỹ thuật
              </Title>
              <Descriptions column={2} bordered size="small" className="mb-8">
                <Descriptions.Item label="Kiểu dáng">
                  {car.carType}
                </Descriptions.Item>
                <Descriptions.Item label="Động cơ">
                  {car.engineSize || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Dẫn động">
                  {car.driveTrain || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Số chỗ">
                  {car.seats} chỗ
                </Descriptions.Item>
                <Descriptions.Item label="Màu ngoại thất">
                  {car.color || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Màu nội thất">
                  {car.interiorColor || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Xuất xứ">
                  {car.origin || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Loại sở hữu">
                  {car.ownerType === "PERSONAL" ? "Cá nhân" : "Công ty"}
                </Descriptions.Item>
                <Descriptions.Item label="Số máy" span={2}>
                  <span className="font-mono">{car.engineNumber || "N/A"}</span>
                </Descriptions.Item>
              </Descriptions>
              {/* SECTION 4: TÍNH NĂNG & MÔ TẢ */}
              {/* SECTION 4: TÍNH NĂNG & MÔ TẢ */}
              {car?.features && (
                <div className="mb-6">
                  <Title level={4} className="flex items-center gap-2">
                    <SafetyCertificateOutlined className="text-indigo-600" />
                    Tính năng nổi bật
                  </Title>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Chuyển đổi dữ liệu về dạng mảng để map
                      let featureList: string[] = [];

                      if (Array.isArray(car.features)) {
                        featureList = car.features;
                      } else if (
                        typeof car.features === "string" &&
                        car.features.trim() !== ""
                      ) {
                        featureList = car.features.split(",");
                      }

                      // Nếu không có dữ liệu sau khi xử lý
                      if (featureList.length === 0)
                        return (
                          <Text type="secondary" className="italic">
                            Đang cập nhật...
                          </Text>
                        );

                      return featureList.map((f: string, i: number) => (
                        <Tag
                          key={i}
                          className="bg-indigo-50 text-indigo-600 border-indigo-100 px-3 py-1 rounded-lg font-medium"
                        >
                          ✓ {f.trim()}
                        </Tag>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <Title level={4} className="flex items-center gap-2">
                <CarryOutOutlined /> Cam kết & Mô tả
              </Title>
              <Paragraph className="text-slate-600 bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-500 italic">
                {car.description || "Chưa có mô tả chi tiết cho xe này."}
              </Paragraph>
            </Col>

            {/* CỘT PHẢI: CARD GIÁ VÀ LIÊN HỆ */}
            <Col xs={24} lg={8}>
              <div className="sticky top-0">
                <Card className="bg-red-600 border-none rounded-2xl shadow-xl shadow-indigo-200">
                  <div className="text-red-600 text-sm mb-1 font-medium">
                    Giá bán niêm yết
                  </div>
                  <div className="text-red-600 text-3xl font-black ">
                    {Number(car.sellingPrice) > 0
                      ? `${Number(car.sellingPrice).toLocaleString()} ₫`
                      : "LIÊN HỆ TVBH"}
                  </div>

                  {car.promotionNote && (
                    <div className="bg-white/10 p-3 rounded-xl text-orange-500 text-xs">
                      <TagOutlined /> <b>Ưu đãi:</b> {car.promotionNote}
                    </div>
                  )}
                </Card>

                {/* THỜI GIAN QUẢN LÝ (Chỉ cho nội bộ xem nếu cần, hoặc ẩn đi) */}
                <div className="mt-6 p-4 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-3 tracking-widest">
                    Lịch sử hệ thống
                  </div>
                  <div className="flex flex-col gap-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Ngày nhập kho:</span>{" "}
                      <b>
                        {new Date(car.createdAt).toLocaleDateString("vi-VN")}
                      </b>
                    </div>
                    {car.refurbishedAt && (
                      <div className="flex justify-between">
                        <span>Hoàn tất tân trang:</span>{" "}
                        <b>
                          {new Date(car.refurbishedAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </b>
                      </div>
                    )}
                    {car.soldAt && (
                      <div className="flex justify-between text-rose-500">
                        <span>Ngày bàn giao:</span>{" "}
                        <b>
                          {new Date(car.soldAt).toLocaleDateString("vi-VN")}
                        </b>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </Modal>
  );
}
