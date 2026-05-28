/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  Modal,
  Descriptions,
  Tag,
  Divider,
  Row,
  Col,
  Typography,
  Empty,
  Image,
  Space,
} from "antd";
import {
  CarOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getCarStatusHelper } from "@/lib/urgencyBadge";
import { getDisplayImageUrl } from "@/utils/googleDrive";

const { Title, Text } = Typography;

export default function ModalDetailCar({ open, onCancel, car }: any) {
  if (!car) return null;

  return (
    <Modal
      title={
        <Space>
          <CarOutlined className="text-indigo-600" />
          <span className="font-bold">CHI TIẾT XE: {car.stockCode}</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
      centered
      className="custom-detail-modal"
    >
      <div className="py-2">
        {/* 1. HÌNH ẢNH XE */}
        <div className="mb-6">
          <Text
            strong
            className="text-slate-400 uppercase text-[10px] tracking-widest block mb-3"
          >
            Hình ảnh thực tế
          </Text>
          {car.images && car.images.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Image.PreviewGroup>
                {car.images.map((img: string, idx: number) => (
                  <Image
                    key={idx}
                    src={getDisplayImageUrl(img)}
                    width={180}
                    height={120}
                    className="object-cover rounded-xl border border-slate-100 shadow-sm"
                  />
                ))}
              </Image.PreviewGroup>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl h-32 flex items-center justify-center border-dashed border-2 border-slate-200">
              <Empty
                description="Chưa có hình ảnh"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
        </div>

        <Row gutter={[24, 24]}>
          {/* 2. THÔNG TIN CHÍNH */}
          <Col xs={24} md={16}>
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              className="bg-white"
            >
              <Descriptions.Item label="Mẫu xe" span={2}>
                <Text strong className="text-indigo-600 uppercase">
                  {car.modelName}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Biển số">
                <Tag color="blue" className="font-bold border-none m-0">
                  {car.licensePlate || "N/A"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số khung (VIN)">
                <Text className="font-mono">{car.vin}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Năm sản xuất">
                {car.year}
              </Descriptions.Item>
              <Descriptions.Item label="Số KM (ODO)">
                {new Intl.NumberFormat().format(car.odo)} km
              </Descriptions.Item>
              <Descriptions.Item label="Hộp số">
                {car.transmission}
              </Descriptions.Item>
              <Descriptions.Item label="Nhiên liệu">
                {car.fuelType}
              </Descriptions.Item>
              <Descriptions.Item label="Kiểu dáng">
                {car.carType}
              </Descriptions.Item>
              <Descriptions.Item label="Chỗ ngồi">
                {car.seats} chỗ
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-6">
              <Text
                strong
                className="text-slate-400 uppercase text-[10px] tracking-widest block mb-2"
              >
                Mô tả chi tiết
              </Text>
              <div className="p-4 bg-slate-50 rounded-xl text-slate-600 text-sm whitespace-pre-wrap italic">
                {car.description || "Không có mô tả chi tiết."}
              </div>
            </div>
          </Col>

          {/* 3. THÔNG TIN GIAO DỊCH & TRẠNG THÁI */}
          <Col xs={24} md={8}>
            <div className="bg-indigo-50 p-6 rounded-4xl h-full border border-indigo-100 shadow-inner">
              <Title level={5} className="mb-4! text-indigo-900!">
                Thông tin nghiệp vụ
              </Title>

              <div className="space-y-4">
                <div>
                  <Text className="text-[10px] text-indigo-400 uppercase font-black tracking-widest block">
                    Trạng thái cuối
                  </Text>
                  <Tag
                    color={getCarStatusHelper(car.status).color}
                    icon={getCarStatusHelper(car.status).icon}
                    className="m-0 border-none font-black text-[10px] px-3 py-1 rounded-full shadow-sm"
                  >
                    {getCarStatusHelper(car.status).label}
                  </Tag>
                </div>

                <Divider className="my-3 border-indigo-100" />

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <CalendarOutlined />
                    <Text className="text-xs text-indigo-700">
                      Cập nhật:{" "}
                      {dayjs(car.updatedAt).format("HH:mm - DD/MM/YYYY")}
                    </Text>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-700">
                    <InfoCircleOutlined />
                    <Text className="text-xs text-indigo-700">
                      Mã kho: {car.stockCode}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
}
