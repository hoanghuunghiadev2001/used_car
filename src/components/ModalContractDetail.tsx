/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
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
  Progress,
  Image,
  Empty,
  Upload,
  Badge,
  Card,
  Statistic,
  message,
} from "antd";
import {
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  TeamOutlined,
  AuditOutlined,
  CarOutlined,
  CameraOutlined,
  DollarOutlined,
  FilePdfOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  CloseOutlined,
  CheckCircleFilled,
  BarcodeOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  CalendarOutlined,
  IdcardOutlined,
  ContainerOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import { getOwnerTypeVn } from "@/lib/status-helper";

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
  if (!data) return null;

  const isCompleted = data.status === "COMPLETED";
  const total = Number(data.totalAmount || 0);
  const deposit = Number(data.depositAmount || 0);
  const remainingAmount = total - deposit;
  console.log(data);

  // Hàm xử lý hiển thị chuẩn xác
  // 1. Link để xem trực tiếp (Fix lỗi render và lỗi 401)
  // 1. Link để xem trực tiếp
  const getContractDisplayUrl = (url: string) => {
    if (!url) return "";
    // Đảm bảo PDF có thể hiển thị trong trình duyệt
    // Chuyển đổi từ /raw/ thành /image/ là một mẹo của Cloudinary để render PDF như ảnh
    // NHƯNG nếu file thực sự là PDF, hãy đảm bảo extension là .pdf
    let formattedUrl = url.replace("/raw/upload/", "/image/upload/");
    if (!formattedUrl.toLowerCase().endsWith(".pdf")) {
      formattedUrl += ".pdf";
    }
    return formattedUrl;
  };

  // 2. Link để tải về
  const getContractDownloadUrl = (url: string) => {
    if (!url) return "";
    // Thêm flags fl_attachment để ép tải về
    const baseUrl = url.replace("/upload/", "/upload/fl_attachment/");
    return baseUrl;
  };

  // 1. Hàm tự động kiểm tra loại file từ chuỗi Base64 (Mặc định là pdf nếu không tìm thấy)
  const getMimeTypeFromBase64 = (base64String: string): string => {
    if (base64String.startsWith("data:")) {
      const match = base64String.match(/data:([^;]+);base64,/);
      if (match && match[1]) return match[1];
    }
    // Nếu chuỗi thô không có prefix, kiểm tra ký tự đầu để đoán
    const firstChar = base64String.charAt(0);
    if (firstChar === "/" || firstChar === "i") return "image/jpeg"; // JPEG hoặc PNG
    if (firstChar === "R") return "application/pdf"; // PDF bắt đầu bằng %PDF (Base64 là JVBERi... hoặc R...)
    return "application/pdf";
  };

  // 2. Hàm chuyển đổi Base64 thành Blob (Giữ nguyên định dạng gốc)
  const base64ToBlob = (
    base64Data: string,
    defaultContentType = "application/pdf",
  ) => {
    const contentType = getMimeTypeFromBase64(base64Data);
    const block = base64Data.split(";base64,");
    const realData = block.length > 1 ? block[1] : block[0];

    const sliceSize = 512;
    const byteCharacters = atob(realData);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  };

  // 🚀 Hàm XEM FILE (Xem được cả Ảnh lẫn PDF trên tab mới)
  const handlePreviewBase64 = (base64String: string) => {
    if (!base64String) return;
    try {
      const blob = base64ToBlob(base64String);
      const fileURL = URL.createObjectURL(blob);

      // Nếu là hình ảnh, ta mở trực tiếp hoặc tạo cấu trúc xem ảnh để không bị lỗi màn hình trắng
      const mimeType = blob.type;
      if (mimeType.startsWith("image/")) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(
            `<style>body{margin:0;background:#0e0e0e;display:flex;justify-content:center;align-items:center;height:100vh;} img{max-width:100%;max-height:100%;object-fit:contain;}</style>
           <img src="${fileURL}" alt="Hợp đồng dạng ảnh"/>`,
          );
          newWindow.document.title = `Xem hợp đồng ${data.contractNumber || ""}`;
        }
      } else {
        // Nếu là PDF thì mở tab mặc định của trình duyệt
        window.open(fileURL, "_blank");
      }
    } catch (error) {
      console.error("Lỗi preview file:", error);
      message.error("Không thể hiển thị bản xem trước.");
    }
  };

  // 🚀 Hàm TẢI FILE về máy (Tự động nhận diện đuôi file .jpg, .png, hoặc .pdf)
  const handleDownloadBase64 = (base64String: string) => {
    if (!base64String) return;
    try {
      const blob = base64ToBlob(base64String);
      const fileURL = URL.createObjectURL(blob);

      // Xác định đuôi file mở rộng (extension) dựa trên MIME type
      let extension = "pdf";
      if (blob.type === "image/jpeg" || blob.type === "image/jpg")
        extension = "jpg";
      if (blob.type === "image/png") extension = "png";

      const link = document.createElement("a");
      link.href = fileURL;
      link.download = `${data.contractNumber || "HopDong"}.${extension}`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error("Lỗi tải file:", error);
      message.error("Gặp lỗi trong quá trình tải tệp tin.");
    }
  };
  return (
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
                  Ghi chú: {data.note}
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
                  valueStyle={{ color: "#3b82f6", fontWeight: 900 }}
                />
              </Card>
            </div>

            {/* 3. CHI TIẾT PHƯƠNG TIỆN (LẤY TỪ CAR OBJECT) */}
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
                        TSure Certified: {data.car?.conditionGrade}
                      </Tag>
                      {data.car?.hasFine && (
                        <Tag icon={<WarningOutlined />} color="error">
                          Phạt nguội: {data.car?.fineNote}
                        </Tag>
                      )}
                      <Tag
                        color={getOwnerTypeVn(data.car?.ownerType).color}
                        className="rounded-md font-bold border-none px-3"
                      >
                        Hình thức: {getOwnerTypeVn(data.car?.ownerType).label}
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
                      className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-all cursor-zoom-in group"
                    >
                      <Image src={src} className="object-cover w-full h-full" />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            </Card>
            <Card
              className="rounded-[2.5rem] shadow-sm border-slate-200"
              title={
                <Space>
                  <CameraOutlined className="text-indigo-600" />{" "}
                  <Text strong className="uppercase text-xs text-slate-500">
                    Giấy giờ xe
                  </Text>
                </Space>
              }
            >
              <Image.PreviewGroup>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {data.customer?.documents?.map((src: string, i: number) => (
                    <div
                      key={i}
                      className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-all cursor-zoom-in group"
                    >
                      <Image src={src} className="object-cover w-full h-full" />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            </Card>
          </Col>

          {/* CỘT PHẢI: KHÁCH HÀNG - NHÂN SỰ - FILE */}
          <Col xs={24} lg={8} className="space-y-6">
            {/* 5. THẺ KHÁCH HÀNG (SANG TRỌNG) */}
            <Card className="rounded-[2.5rem] border-none bg-slate-900! text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <Space align="center" className="mb-6">
                  <Avatar
                    size={64}
                    className="bg-indigo-500! border-2 border-indigo-400/30! shadow-xl"
                    icon={<UserOutlined />}
                  />
                  <div>
                    <Text className="text-white/40! text-[10px] font-black uppercase tracking-[0.2em] block">
                      Chủ xe (Bên A)
                    </Text>
                    <Title level={3} className="text-white!  font-black m-0!">
                      {data.customer?.fullName}
                    </Title>
                  </div>
                </Space>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                    <PhoneOutlined className="text-indigo-400! text-lg" />
                    <Text className="text-white! font-bold">
                      {data.customer?.phone}
                    </Text>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <EnvironmentOutlined className="text-indigo-400! text-lg" />
                    <Text className="text-white/70! text-xs leading-relaxed">
                      {data.customer?.address}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>

            {/* 6. ĐỘI NGŨ NHÂN SỰ PHỤ TRÁCH (SALE & GIÁM ĐỊNH) */}
            <Card
              className="rounded-[2.5rem] shadow-sm border-slate-100! mt-4!"
              title={
                <Space>
                  <TeamOutlined className="text-indigo-600!" />{" "}
                  <Text strong className="uppercase text-xs text-slate-500!">
                    Nhân sự thực hiện
                  </Text>
                </Space>
              }
            >
              <div className="space-y-4 mt-4!">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-indigo-50/50! border border-indigo-100/50!">
                  <Space>
                    <Avatar
                      size="small"
                      className="bg-indigo-600!"
                      icon={<UserOutlined />}
                    />
                    <Text className="text-xs font-bold text-slate-500 uppercase">
                      Sale phụ trách
                    </Text>
                  </Space>
                  <Text className="text-indigo-700 font-black">
                    {data.staff?.fullName}
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
            {/* 7. QUẢN LÝ TẬP TIN HỢP ĐỒNG */}
            <Card
              className="rounded-[2.5rem] border-slate-200 shadow-sm bg-slate-50 border-2 border-dashed mt-4!"
              title={
                <Space>
                  <FilePdfOutlined className="text-rose-500!" />{" "}
                  <Text strong className="uppercase text-xs text-slate-500!">
                    Hợp đồng điện tử (Base64)
                  </Text>
                </Space>
              }
            >
              <div className="flex flex-col items-center py-2 text-center">
                {data.contractFile ? (
                  <div className="flex gap-2 justify-center mb-6">
                    {/* NÚT XEM FILE TRỰC TIẾP */}
                    <Button
                      size="large"
                      icon={<EyeOutlined />}
                      className="rounded-xl font-bold border-slate-200"
                      onClick={() => handlePreviewBase64(data.contractFile)}
                    >
                      XEM FILE
                    </Button>

                    {/* NÚT TẢI FILE VỀ MÁY */}
                    <Button
                      size="large"
                      type="primary"
                      icon={<DownloadOutlined />}
                      className="rounded-xl font-bold bg-indigo-600 border-none shadow-md"
                      onClick={() => handleDownloadBase64(data.contractFile)}
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
                    className="rounded-2xl h-14 font-black bg-white shadow-sm hover:border-indigo-500 transition-all uppercase text-[11px] tracking-tighter"
                  >
                    {data.contractFile
                      ? "Thay thế bản quét mới"
                      : "Tải lên bản scan đóng dấu"}
                  </Button>
                </Upload>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* FOOTER: STICKY ACTIONS */}
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
              <CheckCircleFilled className="text-xl" /> XÁC NHẬN HOÀN TẤT & SOLD
              XE
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
        .ant-descriptions-item-label {
          font-size: 11px !important;
          color: #94a3b8 !important;
        }
      `}</style>
    </Modal>
  );
}
