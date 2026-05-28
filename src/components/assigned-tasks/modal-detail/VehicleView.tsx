/* eslint-disable react/display-name */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo, useMemo } from "react";
import {
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Divider,
  Alert,
  Tooltip,
  Image,
  Empty,
  Card,
} from "antd";
import {
  CalendarOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  FilePdfOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import { getDisplayImageUrl } from "@/utils/googleDrive";

const { Title, Text, Paragraph } = Typography;
const DocumentItem = memo(({ doc, idx }: { doc: any; idx: number }) => {
  const url = doc.url || doc.secure_url || doc;
  const isImage = /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(url);

  return (
    <Col xs={24} sm={12} md={8} lg={6}>
      <Card
        size="small"
        className="rounded-xl border-slate-200 hover:border-indigo-300 transition-colors group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
            {isImage ? (
              <Image
                src={getDisplayImageUrl(url)}
                preview={true}
                loading="lazy"
                className="object-cover w-full! h-full!"
              />
            ) : (
              <FilePdfOutlined className="text-xl text-indigo-500" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <Tooltip title={doc.name || "Tải xuống tài liệu"}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-bold text-slate-700 truncate block group-hover:text-indigo-600"
              >
                {doc.name || `Tài liệu ${idx + 1}`}
              </a>
            </Tooltip>
            <Text type="secondary" className="text-[10px] uppercase">
              {isImage ? "Hình ảnh" : "File tài liệu"}
            </Text>
          </div>
          <a href={url} download target="_blank" rel="noreferrer">
            <DownloadOutlined className="text-slate-400 hover:text-indigo-500 cursor-pointer" />
          </a>
        </div>
      </Card>
    </Col>
  );
});

const CarImageItem = memo(({ src, idx }: { src: string; idx: number }) => (
  <Col xs={8} sm={6} md={4} lg={3}>
    <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-white shadow-sm hover:shadow-md transition-all hover:scale-105 z-10 bg-slate-200">
      <Image
        src={getDisplayImageUrl(src)}
        alt={`car-${idx}`}
        loading="lazy" // Quan trọng để hết lag khi scroll
        className="object-cover w-full! h-full!"
        placeholder={
          <div className="w-full h-full bg-slate-200 animate-pulse" />
        }
        fallback="https://placehold.co/400x400?text=No+Image"
      />
    </div>
  </Col>
));

export const VehicleView = ({ lc, carModels, customerData }: any) => {
  const InfoItem = ({ label, value, icon, color }: any) => (
    <div className="flex flex-col mb-4 h-full">
      <div className="text-gray-500 text-[11px] uppercase flex items-center gap-1 mb-1 font-medium whitespace-nowrap">
        {icon} {label}
      </div>
      <div
        className={`text-[14px] font-bold break-words ${color || "text-slate-800"}`}
      >
        {value || "---"}
      </div>
    </div>
  );

  // Helper parse JSON với useMemo để tránh parse lại khi re-render
  const carImages = useMemo(() => {
    const data = lc?.images || customerData?.carImages;
    if (!data) return [];
    return Array.isArray(data)
      ? data
      : typeof data === "string"
        ? JSON.parse(data)
        : [];
  }, [lc?.images, customerData?.carImages]);

  const documents = useMemo(() => {
    const data = lc?.documents || customerData?.documents;
    if (!data) return [];
    return Array.isArray(data)
      ? data
      : typeof data === "string"
        ? JSON.parse(data)
        : [];
  }, [lc?.documents, customerData?.documents]);

  const modelName =
    carModels.find((m: any) => m.id === lc?.carModelId)?.name ||
    customerData?.carModel?.name;

  // Helper để parse dữ liệu Json an toàn
  const parseJsonData = (data: any) => {
    if (!data) return [];
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  };

  return (
    <div className="p-2 animate-fadeIn max-w-full">
      <Row gutter={[32, 24]}>
        {/* Cột trái: Thông tin cơ bản */}
        <Col xs={24} lg={14}>
          <div className="mb-8 text-center lg:text-left">
            <Text
              type="secondary"
              className="text-[11px] uppercase block mb-1 tracking-wider"
            >
              Dòng xe & Phiên bản
            </Text>
            <Title
              level={3}
              className="!m-0 !text-indigo-600 !font-black uppercase !text-xl md:!text-3xl"
            >
              {modelName}
            </Title>
            <Space className="mt-3 flex-wrap justify-center lg:justify-start">
              <Tag color="blue" className="font-bold px-3 py-1 rounded-md">
                {lc.modelName || "Phiên bản: ---"}
              </Tag>
              <Tag color="cyan" className="font-bold px-3 py-1 rounded-md">
                {lc.carType || "Loại xe: ---"}
              </Tag>
            </Space>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Năm sản xuất"
                value={lc.year}
                icon={<CalendarOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Số ODO"
                value={lc.odo ? `${lc.odo.toLocaleString()} km` : "---"}
                icon={<DashboardOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Màu ngoại thất"
                value={lc.color}
                icon={<BgColorsOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Màu Nội thất"
                value={lc.interiorColor}
                icon={<BgColorsOutlined />}
              />
            </Col>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Hộp số"
                icon={<SettingOutlined />}
                value={
                  lc.transmission === "AUTOMATIC" ? "Số tự động" : "Số sàn"
                }
              />
            </Col>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Nhiên liệu"
                icon={<DashboardOutlined />}
                value={lc.fuelType}
              />
            </Col>
            <Col xs={12} sm={8}>
              <InfoItem
                label="Số chỗ ngồi"
                icon={<TeamOutlined />}
                value={lc.seats ? `${lc.seats} chỗ` : "---"}
              />
            </Col>
          </Row>

          <div className="mt-6">
            {lc.hasFine ? (
              <Alert
                message={
                  <Text className="font-bold text-red-700">
                    CẢNH BÁO PHÁP LÝ: XE CÓ PHẠT NGUỘI
                  </Text>
                }
                description={
                  <div className="mt-1">
                    <Text className="text-red-600">
                      {lc.fineNote || "Chưa có chi tiết."}
                    </Text>
                  </div>
                }
                type="error"
                showIcon
                icon={<WarningOutlined />}
                className="rounded-xl border-red-200 bg-red-50"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircleOutlined className="text-emerald-500" />
                <Text className="text-emerald-700 font-medium text-[13px]">
                  Kiểm tra pháp lý:{" "}
                  <Text className="font-bold text-emerald-800">
                    Không có phạt nguội
                  </Text>
                </Text>
              </div>
            )}
          </div>
        </Col>

        {/* Cột phải: Định danh & Giá */}
        <Col
          xs={24}
          lg={10}
          className="lg:border-l lg:border-slate-100 lg:pl-10"
        >
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <InfoItem
              label="Biển số xe"
              value={
                <Tag
                  color="blue"
                  className="px-4 py-1 text-lg md:text-xl font-bold font-mono m-0 w-full text-center lg:w-auto"
                >
                  {lc.licensePlate || "N/A"}
                </Tag>
              }
            />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <InfoItem label="Số VIN" value={lc.vin} />
              <InfoItem label="Số máy" value={lc.engineNumber} />
            </div>
            <Divider className="my-6 border-slate-200" />
            <div className="flex flex-col gap-4">
              <InfoItem
                label="Giá khách muốn"
                value={
                  lc.expectedPrice
                    ? `${Number(lc.expectedPrice).toLocaleString()}`
                    : "---"
                }
                color="text-emerald-600 text-lg md:text-xl font-black"
              />
              <InfoItem
                label="Định giá T-Sure"
                value={
                  lc.tSurePrice
                    ? `${Number(lc.tSurePrice).toLocaleString()}`
                    : "---"
                }
                color="text-indigo-600 text-lg md:text-xl font-black"
              />
            </div>
          </div>
        </Col>
      </Row>

      {customerData.type !== "BUY" && (
        <>
          {/* --- SECTION 5: HÌNH ẢNH GIÁM ĐỊNH --- */}
          <Divider className="mt-10!">
            <Space>
              <PictureOutlined className="text-rose-500" />
              <Text strong className="uppercase text-slate-600">
                Hình ảnh thực tế (Giám định)
              </Text>
            </Space>
          </Divider>
          <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 shadow-inner">
            {carImages.length > 0 ? (
              <Image.PreviewGroup>
                <Row gutter={[12, 12]} style={{ transform: "translateZ(0)" }}>
                  {carImages.map((img: any, idx: number) => (
                    <CarImageItem
                      key={idx}
                      src={getDisplayImageUrl(img.url || img.secure_url || img)}
                      idx={idx}
                    />
                  ))}
                </Row>
              </Image.PreviewGroup>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa tải lên hình ảnh xe"
              />
            )}
          </div>

          {/* --- SECTION 6: TÀI LIỆU HỒ SƠ --- */}
          <Divider className="mt-10!">
            <Space>
              <FilePdfOutlined className="text-indigo-500" />
              <Text strong className="uppercase text-slate-600">
                Hồ sơ & Tài liệu pháp lý
              </Text>
            </Space>
          </Divider>
          <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 mb-6">
            {documents.length > 0 ? (
              <Row gutter={[16, 16]} style={{ transform: "translateZ(0)" }}>
                {documents.map((doc: any, idx: number) => (
                  <DocumentItem key={idx} doc={doc} idx={idx} />
                ))}
              </Row>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có tài liệu đính kèm"
              />
            )}
          </div>
        </>
      )}

      {/* Pháp lý & Bảo hiểm */}
      <Row gutter={[24, 24]} className="mt-8">
        <Col xs={24} md={14} lg={16}>
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 h-full">
            <div className="text-[11px] uppercase font-bold text-slate-400 mb-4 tracking-widest">
              Chi tiết kỹ thuật & Pháp lý
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8}>
                <InfoItem label="Hệ dẫn động" value={lc.driveTrain} />
              </Col>
              <Col xs={12} sm={8}>
                <InfoItem
                  label="Nguồn gốc"
                  value={lc.origin === "VN" ? "Trong nước" : "Nhập khẩu"}
                />
              </Col>
              <Col xs={12} sm={8}>
                <InfoItem
                  label="Loại sở hữu"
                  value={lc.ownerType === "PERSONAL" ? "Cá nhân" : "Công ty"}
                />
              </Col>
            </Row>
          </div>
        </Col>

        <Col xs={24} md={10} lg={8}>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-full">
            <div className="text-[11px] uppercase font-bold text-slate-400 mb-4 tracking-widest">
              Thời hạn & Bảo hiểm
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Text>
                  <SafetyCertificateOutlined className="text-blue-500 mr-2" />{" "}
                  Đăng kiểm
                </Text>
                <Text strong>
                  {lc.registrationDeadline
                    ? dayjs(lc.registrationDeadline).format("DD/MM/YYYY")
                    : "---"}
                </Text>
              </div>
              <Tooltip
                title={
                  lc.insuranceDSCorp
                    ? `Hãng: ${lc.insuranceDSCorp}`
                    : "Không có thông tin hãng"
                }
              >
                <div className="flex justify-between items-center cursor-help group p-1 hover:bg-slate-50 rounded">
                  <Text>
                    <AuditOutlined className="text-emerald-500 mr-2" /> BH TNDS{" "}
                    <InfoCircleOutlined className="text-[10px] opacity-0 group-hover:opacity-100 transition-all" />
                  </Text>
                  <Tag
                    color={
                      dayjs(lc.insuranceTNDSDeadline).isAfter(dayjs())
                        ? "green"
                        : "red"
                    }
                  >
                    {lc.insuranceTNDSDeadline
                      ? dayjs(lc.insuranceTNDSDeadline).format("DD/MM/YYYY")
                      : "---"}
                  </Tag>
                </div>
              </Tooltip>
              <Tooltip
                title={
                  lc.insuranceVCCorp
                    ? `Hãng: ${lc.insuranceVCCorp}`
                    : "Không có thông tin hãng"
                }
              >
                <div className="flex justify-between items-center cursor-help group p-1 hover:bg-slate-50 rounded">
                  <Text>
                    <SafetyCertificateOutlined className="text-orange-500 mr-2" />{" "}
                    BH Vật chất{" "}
                    <InfoCircleOutlined className="text-[10px] opacity-0 group-hover:opacity-100 transition-all" />
                  </Text>
                  <Tag
                    color={
                      dayjs(lc.insuranceVCDeadline).isAfter(dayjs())
                        ? "green"
                        : "red"
                    }
                  >
                    {lc.insuranceVCDeadline
                      ? dayjs(lc.insuranceVCDeadline).format("DD/MM/YYYY")
                      : "---"}
                  </Tag>
                </div>
              </Tooltip>
            </div>
          </div>
        </Col>
      </Row>

      {lc.note && (
        <div className="mt-8 p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
          <Text className="text-[11px] font-black text-amber-700 uppercase block mb-2 tracking-widest">
            Ghi chú kỹ thuật & Thẩm định
          </Text>
          <Paragraph className="text-[14px] text-slate-700 m-0 italic leading-relaxed">
            {lc.note}
          </Paragraph>
        </div>
      )}
    </div>
  );
};
