/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Modal,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Divider,
  Avatar,
  Descriptions,
  Image,
  Upload,
  Card,
  Statistic,
  message,
} from "antd";
import {
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  TeamOutlined,
  CarOutlined,
  CameraOutlined,
  FilePdfOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  CloseOutlined,
  CheckCircleFilled,
  DashboardOutlined,
  IdcardOutlined,
  ContainerOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import { getOwnerTypeVn } from "@/lib/status-helper";
import { getDisplayImageUrl } from "@/utils/googleDrive";

const { Title, Text } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onComplete: (id: string, no: string) => void;
  onFileUpload: (file: File) => void;
  uploading: boolean;
}

export default function ModalContractDetail({
  isOpen,
  onClose,
  data,
  onComplete,
  onFileUpload,
  uploading,
}: Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!data) return null;

  const isCompleted = data.status === "COMPLETED";
  const total = Number(data.totalAmount || 0);
  const deposit = Number(data.depositAmount || 0);
  const remainingAmount = total - deposit;

  // Lấy ID File được lưu trữ (Ưu tiên đúng trường ID Google Drive từ database)
  const fileId = data.contractFileStoredId || data.contractFile;

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={onClose}
        width={1300}
        centered
        footer={null}
        closeIcon={
          <div className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-all">
            <CloseOutlined />
          </div>
        }
        className="modern-contract-modal"
        destroyOnClose
      >
        {/* 1. HEADER: GRADIENT & IDENTITY */}
        <div
          className={`-mx-6 -mt-6 p-8 mb-8 rounded-t-[2.5rem] relative overflow-hidden overflow-x-hidden ${isCompleted ? "bg-gradient-to-br from-emerald-800 to-teal-600" : "bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900"}`}
        >
          <div className="relative z-10">
            <Row justify="space-between" align="bottom" gutter={[24, 24]}>
              <Col xs={24} md={16}>
                <Space direction="vertical" size={0}>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 mb-3 w-fit">
                    <ContainerOutlined className="text-emerald-400" />
                    <Text className="text-white! text-[10px] font-black uppercase tracking-[0.25em]">
                      Hợp đồng mua bán
                    </Text>
                  </div>
                  <Title
                    level={1}
                    className="m-0! text-white! font-black tracking-tighter drop-shadow-lg"
                  >
                    {data.contractNumber}
                  </Title>
                  <Text className="text-white/60! text-xs italic mt-2 block">
                    Ghi chú: {data.note || "Không có ghi chú"}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} md={8} className="text-right">
                <div className="bg-white/5 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 inline-block shadow-2xl">
                  <Space size="large">
                    <div className="text-center">
                      <Text className="text-white/40! text-[10px] block uppercase font-black mb-1">
                        Ngày ký kết
                      </Text>
                      <Text className="text-white! font-bold text-lg">
                        {data.signedAt
                          ? dayjs(data.signedAt).format("DD/MM/YYYY")
                          : "---"}
                      </Text>
                    </div>
                    <Divider type="vertical" className="bg-white/20 h-10" />
                    <div className="text-center px-2">
                      <Text className="text-white/40! text-[10px] block uppercase font-black mb-1">
                        Trạng thái hồ sơ
                      </Text>
                      <Tag
                        color={isCompleted ? "green" : "blue"}
                        className="m-0 border-none font-black px-5 py-1 rounded-full uppercase text-[11px]"
                      >
                        {isCompleted ? "Đã Quyết Toán" : "Đang thực hiện"}
                      </Tag>
                    </div>
                  </Space>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto custom-scrollbar px-2 pb-6 overflow-x-hidden">
          <Row gutter={[24, 24]}>
            {/* CỘT TRÁI: DỮ LIỆU XE & TÀI CHÍNH */}
            <Col xs={24} lg={16} className="space-y-6">
              {/* 2. FINANCIAL MATRIX */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-3xl border-none bg-rose-50 shadow-sm">
                  <Statistic
                    title={
                      <Text className="text-rose-400 font-black text-[10px] uppercase">
                        Tổng trị giá (Bên B mua)
                      </Text>
                    }
                    value={total}
                    suffix="đ"
                    valueStyle={{ color: "#e11d48", fontWeight: 900 }}
                  />
                </Card>
                <Card className="rounded-3xl border-none bg-emerald-50 shadow-sm">
                  <Statistic
                    title={
                      <Text className="text-emerald-400 font-black text-[10px] uppercase">
                        Đã đặt cọc
                      </Text>
                    }
                    value={deposit}
                    suffix="đ"
                    valueStyle={{ color: "#059669", fontWeight: 900 }}
                  />
                </Card>
                <Card className="rounded-3xl border-none bg-indigo-600 shadow-xl">
                  <Statistic
                    title={
                      <Text className="text-white/60 font-black text-[10px] uppercase">
                        Số tiền còn lại
                      </Text>
                    }
                    value={remainingAmount}
                    suffix="đ"
                    valueStyle={{ color: "#ffffff", fontWeight: 900 }}
                  />
                </Card>
              </div>

              {/* 3. CHI TIẾT PHƯƠNG TIỆN */}
              <Card
                className="rounded-[2rem] shadow-sm border-slate-200"
                title={
                  <Space>
                    <CarOutlined className="text-indigo-600" />{" "}
                    <Text strong className="uppercase text-xs">
                      Thông số phương tiện chi tiết
                    </Text>
                  </Space>
                }
                extra={
                  <Tag
                    color="blue"
                    className="rounded-lg font-black border-none px-6 m-0 bg-indigo-50 text-indigo-700 text-base"
                  >
                    {data.car?.licensePlate || "N/A"}
                  </Tag>
                }
              >
                <Row gutter={[32, 32]}>
                  <Col xs={24} md={12}>
                    <Descriptions
                      column={1}
                      labelStyle={{
                        color: "#94a3b8",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                      contentStyle={{ fontWeight: 700, color: "#1e293b" }}
                    >
                      <Descriptions.Item label="Tên mẫu xe">
                        {data.car?.modelName}
                      </Descriptions.Item>
                      <Descriptions.Item label="Số khung (VIN)">
                        <Text copyable className="font-mono text-indigo-600">
                          {data.car?.vin}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Số máy">
                        {data.car?.engineNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label="Năm sản xuất">
                        {data.car?.year}
                      </Descriptions.Item>
                      <Descriptions.Item label="Nguồn gốc">
                        {data.car?.origin === "VN" ? "Trong nước" : "Nhập khẩu"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col xs={24} md={12}>
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-2 gap-y-6">
                      <Statistic
                        title={
                          <Text className="text-[10px] uppercase font-bold text-slate-400">
                            ODO
                          </Text>
                        }
                        value={data.car?.odo}
                        suffix=" km"
                        valueStyle={{ fontSize: 18, fontWeight: 900 }}
                        prefix={<DashboardOutlined />}
                      />
                      <Statistic
                        title={
                          <Text className="text-[10px] uppercase font-bold text-slate-400">
                            Nhiên liệu
                          </Text>
                        }
                        value={data.car?.fuelType}
                        valueStyle={{ fontSize: 16, fontWeight: 900 }}
                        prefix={<ThunderboltOutlined />}
                      />
                      <Statistic
                        title={
                          <Text className="text-[10px] uppercase font-bold text-slate-400">
                            Hộp số
                          </Text>
                        }
                        value={
                          data.car?.transmission === "AUTOMATIC"
                            ? "Số tự động"
                            : "Số sàn"
                        }
                        valueStyle={{ fontSize: 16, fontWeight: 900 }}
                        prefix={<SettingOutlined />}
                      />
                      <Statistic
                        title={
                          <Text className="text-[10px] uppercase font-bold text-slate-400">
                            Ngoại thất
                          </Text>
                        }
                        value={data.car?.color}
                        valueStyle={{ fontSize: 16, fontWeight: 900 }}
                      />
                    </div>
                  </Col>
                  <Col span={24}>
                    <Divider className="m-0" />
                    <div className="pt-4">
                      <Text
                        strong
                        className="text-[10px] text-slate-400 uppercase block mb-3"
                      >
                        Tình trạng pháp lý & Chứng nhận
                      </Text>
                      <Space wrap>
                        <Tag icon={<CheckCircleFilled />} color="processing">
                          TSure Certified: {data.car?.conditionGrade || "N/A"}
                        </Tag>
                        {data.car?.hasFine && (
                          <Tag icon={<WarningOutlined />} color="error">
                            Phạt nguội: {data.car?.fineNote}
                          </Tag>
                        )}
                        <Tag
                          color={
                            getOwnerTypeVn(data.car?.ownerType)?.color ||
                            "default"
                          }
                          className="rounded-md font-bold border-none px-3"
                        >
                          Hình thức:{" "}
                          {getOwnerTypeVn(data.car?.ownerType)?.label || "N/A"}
                        </Tag>
                      </Space>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 4. HÌNH ẢNH GIÁM ĐỊNH */}
              <Card
                className="rounded-[2.5rem] shadow-sm border-slate-200"
                title={
                  <Space>
                    <CameraOutlined className="text-indigo-600" />{" "}
                    <Text strong className="uppercase text-xs text-slate-500">
                      Album ảnh giám định thực tế
                    </Text>
                  </Space>
                }
              >
                <Image.PreviewGroup>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {data.customer?.carImages?.map((src: string, i: number) => (
                      <div
                        key={i}
                        className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-all cursor-zoom-in"
                      >
                        <Image
                          src={getDisplayImageUrl(src)}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                </Image.PreviewGroup>
              </Card>

              {/* GIẤY TỜ XE */}
              <Card
                className="rounded-[2.5rem] shadow-sm border-slate-200"
                title={
                  <Space>
                    <CameraOutlined className="text-indigo-600" />{" "}
                    <Text strong className="uppercase text-xs text-slate-500">
                      Giấy tờ xe đính kèm
                    </Text>
                  </Space>
                }
              >
                <Image.PreviewGroup>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {data.customer?.documents?.map((src: string, i: number) => (
                      <div
                        key={i}
                        className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-all cursor-zoom-in"
                      >
                        <Image
                          src={getDisplayImageUrl(src)}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                </Image.PreviewGroup>
              </Card>
            </Col>

            {/* CỘT PHẢI: KHÁCH HÀNG - NHÂN SỰ - FILE */}
            <Col xs={24} lg={8} className="space-y-6">
              {/* 5. THẺ KHÁCH HÀNG */}
              <Card className="rounded-[2.5rem] border-none bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <Space align="center" className="mb-6">
                    <Avatar
                      size={64}
                      className="bg-indigo-500 border-2 border-indigo-400/30 shadow-xl"
                      icon={<UserOutlined />}
                    />
                    <div>
                      <Text className="text-black/40! text-[10px] font-black uppercase tracking-[0.2em] block">
                        Chủ xe (Bên A)
                      </Text>
                      <Title level={3} className="text-black! font-black m-0!">
                        {data.customer?.fullName}
                      </Title>
                    </div>
                  </Space>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-3 bg-black/5 p-4 rounded-2xl border border-black/10 hover:bg-black/10 transition-colors">
                      <PhoneOutlined className="text-indigo-400 text-lg" />
                      <Text className="text-black! font-bold">
                        {data.customer?.phone}
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 6. ĐỘI NGŨ NHÂN SỰ PHỤ TRÁCH */}
              <Card
                className="rounded-[2.5rem] shadow-sm border-slate-100 mt-4"
                title={
                  <Space>
                    <TeamOutlined className="text-indigo-600" />{" "}
                    <Text strong className="uppercase text-xs text-slate-500">
                      Nhân sự thực hiện
                    </Text>
                  </Space>
                }
              >
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                    <Space>
                      <Avatar
                        size="small"
                        className="bg-indigo-600"
                        icon={<UserOutlined />}
                      />
                      <Text className="text-xs font-bold text-slate-500 uppercase">
                        Sale phụ trách
                      </Text>
                    </Space>
                    <Text className="text-indigo-700 font-black">
                      {data.staff?.fullName || "Chưa phân công"}
                    </Text>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                    <Space>
                      <Avatar
                        size="small"
                        className="bg-emerald-600"
                        icon={<SecurityScanOutlined />}
                      />
                      <Text className="text-xs font-bold text-slate-500 uppercase">
                        Giám định viên
                      </Text>
                    </Space>
                    <Text className="text-emerald-700 font-black">
                      {data.customer?.inspectorRef?.fullName || "Chưa có"}
                    </Text>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <Space>
                      <Avatar
                        size="small"
                        className="bg-slate-400"
                        icon={<IdcardOutlined />}
                      />
                      <Text className="text-xs font-bold text-slate-500 uppercase">
                        Người giới thiệu
                      </Text>
                    </Space>
                    <Text className="text-slate-700 font-bold text-xs">
                      {data.customer?.referrer?.fullName || "N/A"}
                    </Text>
                  </div>
                </div>
              </Card>

              {/* 7. QUẢN LÝ TẬP TIN HỢP ĐỒNG */}
              <Card
                className="rounded-[2.5rem] border-slate-200 shadow-sm bg-slate-50 border-2 border-dashed mt-4"
                title={
                  <Space>
                    <FilePdfOutlined className="text-rose-500" />{" "}
                    <Text strong className="uppercase text-xs text-slate-500">
                      Hợp đồng hồ sơ scan
                    </Text>
                  </Space>
                }
              >
                <div className="flex flex-col items-center py-2 text-center">
                  {fileId ? (
                    <div className="flex gap-2 justify-center mb-6 w-full">
                      {/* NÚT XEM FILE ĐƯỢC CHỈNH STATE */}
                      <Button
                        size="large"
                        icon={<EyeOutlined />}
                        className="rounded-xl font-bold border-slate-200 flex-1"
                        onClick={() => setIsPreviewOpen(true)}
                      >
                        XEM FILE
                      </Button>

                      {/* NÚT TẢI FILE CHUẨN API */}
                      <Button
                        type="primary"
                        size="large"
                        icon={<DownloadOutlined />}
                        className="rounded-xl font-bold flex-1 bg-indigo-600"
                        href={`/api/contract-file?id=${fileId}&action=download`}
                        target="_blank"
                      >
                        TẢI VỀ
                      </Button>
                    </div>
                  ) : (
                    <div className="py-6 opacity-40 italic flex flex-col items-center">
                      <FilePdfOutlined className="text-4xl mb-2" />
                      <Text className="text-xs">
                        Chưa có bản quét hồ sơ đóng dấu
                      </Text>
                    </div>
                  )}

                  <Upload
                    showUploadList={false}
                    beforeUpload={(file) => {
                      onFileUpload(file);
                      return false;
                    }}
                  >
                    <Button
                      loading={uploading}
                      icon={<UploadOutlined />}
                      block
                      className="rounded-2xl h-14 font-black bg-white shadow-sm hover:border-indigo-500 transition-all uppercase text-[11px]"
                    >
                      {fileId
                        ? "Thay thế bản quét mới"
                        : "Tải lên bản scan đóng dấu"}
                    </Button>
                  </Upload>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* FOOTER: ACTION BOTTOM */}
        <div className="bg-white pt-6 border-t border-slate-100 flex flex-col md:flex-row overflow-x-hidden justify-between items-center gap-6">
          <Space direction="vertical" size={0}>
            <Text className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">
              Hệ thống ghi nhận vào lúc
            </Text>
            <Text className="text-[11px] font-bold text-slate-400">
              {dayjs(data.createdAt).format("DD/MM/YYYY HH:mm:ss")}
            </Text>
          </Space>

          <Space size="middle" className="w-full md:w-auto">
            <Button
              size="large"
              className="rounded-2xl font-bold px-10 h-14 border-slate-200 hover:bg-slate-50 transition-all"
              onClick={onClose}
            >
              HỦY BỎ
            </Button>
            {!isCompleted && data.status === "SIGNED" && (
              <Button
                size="large"
                type="primary"
                className="rounded-2xl font-black h-14 px-12 bg-emerald-600 shadow-2xl shadow-emerald-200 border-none hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3"
                onClick={() => onComplete(data.id, data.contractNumber)}
              >
                <CheckCircleFilled className="text-xl" /> XÁC NHẬN HOÀN TẤT &
                SOLD XE
              </Button>
            )}
          </Space>
        </div>

        <style jsx global>{`
          .modern-contract-modal .ant-modal-content {
            padding: 24px !important;
            border-radius: 3rem !important;
            background: #f8fafc !important;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
        `}</style>
      </Modal>

      {/* 🚀 MODAL ĐỘC LẬP ĐỂ HIỂN THỊ XEM TRỰC TIẾP FILE HỢP ĐỒNG KHÔNG BỊ CHẾT KHUNG */}
      <Modal
        title={
          <Text className="font-black text-sm uppercase text-slate-700">
            Chi tiết bản scan hợp đồng thương mại
          </Text>
        }
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        width={1050}
        centered
        destroyOnClose
        footer={[
          <Button
            key="close"
            type="primary"
            size="large"
            className="rounded-xl font-bold px-6"
            onClick={() => setIsPreviewOpen(false)}
          >
            ĐÓNG KHUNG XEM
          </Button>,
        ]}
      >
        {fileId ? (
          <div className="w-full h-[75vh] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 mt-3">
            <iframe
              src={`/api/contract-file?id=${fileId}&action=view`}
              className="w-full h-full"
              title="Bản scan PDF hợp đồng"
              frameBorder="0"
            />
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            Không tìm thấy mã tập tin hồ sơ
          </div>
        )}
      </Modal>
    </>
  );
}
