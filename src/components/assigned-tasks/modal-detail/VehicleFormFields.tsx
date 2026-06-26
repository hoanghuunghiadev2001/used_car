/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useCallback } from "react";
import {
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Divider,
  Typography,
  Card,
  Upload,
  Button,
  Switch,
  Space,
  message,
  Modal,
  Tag,
  Badge,
} from "antd";
import {
  CarOutlined,
  DollarOutlined,
  FileSearchOutlined,
  FireOutlined,
  GlobalOutlined,
  PlusOutlined,
  PictureOutlined,
  WarningOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  FilePdfOutlined,
  EyeOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

// ─── Provinces ───────────────────────────────────────────────────────────────
const provinces = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cần Thơ",
  "Cao Bằng",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "TP Hồ Chí Minh",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

// ─── Section Header Component ─────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  title,
  color = "#6366f1",
}: {
  icon: React.ReactNode;
  title: string;
  color?: string;
}) => (
  <div className="flex items-center gap-3 mb-6 mt-2">
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm"
      style={{ background: color }}
    >
      {icon}
    </div>
    <div
      className="flex-1 h-px"
      style={{
        background: `linear-gradient(to right, ${color}33, transparent)`,
      }}
    />
    <span
      className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
      style={{ color, borderColor: `${color}33`, background: `${color}0d` }}
    >
      {title}
    </span>
    <div
      className="flex-1 h-px"
      style={{
        background: `linear-gradient(to left, ${color}33, transparent)`,
      }}
    />
  </div>
);

// ─── Urgency Badge ────────────────────────────────────────────────────────────
const urgencyConfig: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  HOT: { color: "#ef4444", bg: "#fef2f2", label: "🔥 HOT" },
  WARM: { color: "#f97316", bg: "#fff7ed", label: "☀️ WARM" },
  COOL: { color: "#3b82f6", bg: "#eff6ff", label: "❄️ COOL" },
};

// ─── Inline File/Image Preview ────────────────────────────────────────────────
interface PreviewFile {
  uid: string;
  name: string;
  status?: string;
  url?: string;
  thumbUrl?: string;
  type?: string;
  response?: { url: string };
  originFileObj?: File;
  percent?: number;
}

const FilePreviewGrid = ({
  files,
  onRemove,
}: {
  files: PreviewFile[];
  onRemove: (uid: string) => void;
}) => {
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    src: string;
    name: string;
    isPdf: boolean;
  }>({
    open: false,
    src: "",
    name: "",
    isPdf: false,
  });

  const getFileUrl = (f: PreviewFile) =>
    f.url || f.response?.url || f.thumbUrl || "";

  const isPdf = (f: PreviewFile) =>
    f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf");

  const openPreview = (f: PreviewFile) => {
    const src = getFileUrl(f);
    if (!src) return;
    setLightbox({ open: true, src, name: f.name, isPdf: isPdf(f) });
  };

  if (!files || files.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
        {files.map((f) => {
          const url = getFileUrl(f);
          const isImg = !isPdf(f);
          const uploading = f.status === "uploading";
          const error = f.status === "error";

          return (
            <div
              key={f.uid}
              className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
              style={{ aspectRatio: "1" }}
            >
              {/* Thumbnail */}
              {isImg && url ? (
                <img
                  src={url}
                  alt={f.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                  <FilePdfOutlined className="text-2xl text-red-400" />
                  <span className="text-[10px] text-gray-500 text-center line-clamp-2 leading-tight">
                    {f.name}
                  </span>
                </div>
              )}

              {/* Upload progress overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                  <LoadingOutlined className="text-white text-lg" />
                  <span className="text-white text-[10px]">
                    {Math.round(f.percent || 0)}%
                  </span>
                </div>
              )}

              {/* Error overlay */}
              {error && (
                <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                  <CloseCircleOutlined className="text-white text-xl" />
                </div>
              )}

              {/* Hover actions */}
              {!uploading && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {url && (
                    <button
                      type="button"
                      onClick={() => openPreview(f)}
                      className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition shadow"
                    >
                      <EyeOutlined className="text-sm" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(f.uid)}
                    className="w-8 h-8 rounded-full bg-red-500/90 flex items-center justify-center text-white hover:bg-red-600 transition shadow"
                  >
                    <DeleteOutlined className="text-sm" />
                  </button>
                </div>
              )}

              {/* Status badge */}
              {f.status === "done" && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircleOutlined className="text-white text-[9px]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <Modal
        open={lightbox.open}
        onCancel={() => setLightbox((p) => ({ ...p, open: false }))}
        footer={null}
        width="90vw"
        style={{ maxWidth: 900, top: 20 }}
        title={
          <span className="text-sm font-medium text-gray-700 truncate block max-w-[80%]">
            {lightbox.name}
          </span>
        }
        styles={{
          body: {
            padding: 0,
            overflow: "hidden",
            borderRadius: "0 0 12px 12px",
          },
        }}
      >
        {lightbox.isPdf ? (
          <iframe
            src={lightbox.src}
            className="w-full border-0"
            style={{ height: "80vh" }}
            title={lightbox.name}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-gray-900 p-4"
            style={{ minHeight: 300 }}
          >
            <img
              src={lightbox.src}
              alt={lightbox.name}
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}
      </Modal>
    </>
  );
};

// ─── Upload Zone ──────────────────────────────────────────────────────────────
const UploadZone = ({
  accept,
  multiple,
  onUpload,
  label,
  hint,
}: {
  accept: string;
  multiple?: boolean;
  onUpload: (options: any) => void;
  label: string;
  hint?: string;
}) => (
  <Upload
    customRequest={onUpload}
    multiple={multiple}
    accept={accept}
    showUploadList={false}
    className="w-full"
  >
    <button
      type="button"
      className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-5 px-4 flex flex-col items-center gap-2
        hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
        <CloudUploadOutlined className="text-indigo-500 text-lg" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </button>
  </Upload>
);

// ─── Switch Field ─────────────────────────────────────────────────────────────
const SwitchField = ({
  name,
  label,
  onLabel,
  offLabel,
  activeColor = "#3b82f6",
}: {
  name: string;
  label: string;
  onLabel: string;
  offLabel: string;
  activeColor?: string;
}) => {
  const form = Form.useFormInstance();
  const val = Form.useWatch(name, form);
  return (
    <Form.Item name={name} label={label} valuePropName="checked">
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all select-none"
        style={{
          background: val ? `${activeColor}15` : "#f9fafb",
          borderColor: val ? `${activeColor}50` : "#e5e7eb",
        }}
        onClick={() => form.setFieldValue(name, !val)}
      >
        <div
          className="w-8 h-4 rounded-full relative transition-colors flex-shrink-0"
          style={{ background: val ? activeColor : "#d1d5db" }}
        >
          <div
            className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
            style={{ left: val ? "calc(100% - 14px)" : "2px" }}
          />
        </div>
        <span
          className="text-xs font-semibold"
          style={{ color: val ? activeColor : "#6b7280" }}
        >
          {val ? onLabel : offLabel}
        </span>
      </div>
    </Form.Item>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const VehicleFormFields = ({
  carModels = [],
  notSeenReasons = [],
  sellReasons = [],
  buyReasons = [],
  users = [],
  type,
}: any) => {
  const form = Form.useFormInstance();
  const inspectStatus = Form.useWatch("inspectStatus", form);
  const isCertified = Form.useWatch("isCertified", form);
  const hasFine = Form.useWatch("hasFine", form);
  const insuranceregistrationDeadline = Form.useWatch(
    "insuranceregistrationDeadline",
    form,
  );
  const insuranceTNDS = Form.useWatch("insuranceTNDS", form);
  const insuranceVC = Form.useWatch("insuranceVC", form);
  const urgencyLevel = Form.useWatch("urgencyLevel", form);

  const isBuyType = type === "BUY";
  const showInspectionDetails = !isBuyType && inspectStatus === "INSPECTED";

  // File lists state
  const [carImages, setCarImages] = useState<PreviewFile[]>([]);
  const [documents, setDocuments] = useState<PreviewFile[]>([]);

  const conditionOptions = [
    "Mức 5: Xuất sắc – gần như mới",
    "Mức 4: Rất tốt – có thể trưng bày ngay",
    "Mức 3: Bình thường",
    "Mức 2: Cần sửa chữa",
    "Mức 1: Cần sửa chữa nhiều",
  ];

  // ─── Upload handler ─────────────────────────────────────────────────────────
  const makeUploadHandler = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<PreviewFile[]>>,
      fieldName: string,
    ) =>
      async (options: any) => {
        const { file, onSuccess, onError, onProgress } = options;

        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
          message.error("File không được vượt quá 10MB!");
          onError(new Error("File quá lớn"));
          return;
        }

        // Add placeholder immediately
        const placeholder: PreviewFile = {
          uid: file.uid,
          name: file.name,
          status: "uploading",
          percent: 0,
          type: file.type,
          thumbUrl: file.type?.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        };
        setter((prev) => [...prev, placeholder]);

        try {
          const res = await fetch("/api/uploadFile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            }),
          });
          if (!res.ok)
            throw new Error((await res.json()).error || "Lỗi server");
          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          const { uploadUrl, url } = data;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const pct = (e.loaded / e.total) * 100;
                onProgress?.({ percent: pct });
                setter((prev) =>
                  prev.map((f) =>
                    f.uid === file.uid ? { ...f, percent: pct } : f,
                  ),
                );
              }
            });
            xhr.addEventListener("load", () => {
              if (xhr.status === 200 || xhr.status === 201) {
                setter((prev) =>
                  prev.map((f) =>
                    f.uid === file.uid
                      ? { ...f, status: "done", url, percent: 100 }
                      : f,
                  ),
                );
                onSuccess({ url }, file);
                // Sync to form
                const current = form.getFieldValue(fieldName) || [];
                form.setFieldValue(fieldName, [
                  ...current.filter((x: any) => x.uid !== file.uid),
                  { uid: file.uid, name: file.name, status: "done", url },
                ]);
                message.success(`✅ ${file.name} đã tải lên`);
                resolve();
              } else reject(new Error(`HTTP ${xhr.status}`));
            });
            xhr.addEventListener("error", () =>
              reject(new Error("Network error")),
            );
            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", file.type);
            xhr.send(file);
          });
        } catch (err: any) {
          setter((prev) =>
            prev.map((f) =>
              f.uid === file.uid ? { ...f, status: "error" } : f,
            ),
          );
          onError(err);
          message.error(`❌ ${err.message}`);
        }
      },
    [form],
  );

  const handleCarImageUpload = makeUploadHandler(setCarImages, "carImages");
  const handleDocumentUpload = makeUploadHandler(setDocuments, "documents");

  const removeFile =
    (
      setter: React.Dispatch<React.SetStateAction<PreviewFile[]>>,
      fieldName: string,
    ) =>
    (uid: string) => {
      setter((prev) => prev.filter((f) => f.uid !== uid));
      const current = form.getFieldValue(fieldName) || [];
      form.setFieldValue(
        fieldName,
        current.filter((f: any) => f.uid !== uid),
      );
    };

  // ─── Urgency indicator ──────────────────────────────────────────────────────
  const urg = urgencyLevel ? urgencyConfig[urgencyLevel] : null;

  return (
    <div className="space-y-0 pb-10">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: KHÁCH HÀNG                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<UserOutlined />}
        title="Khách hàng & Phân loại"
        color="#6366f1"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="fullName"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tên khách hàng
                </span>
              }
            >
              <Input
                prefix={<UserOutlined className="text-indigo-400" />}
                className="rounded-xl"
                placeholder="Nguyễn Văn A"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="phone"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Số điện thoại
                </span>
              }
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-300" />}
                disabled
                className="rounded-xl"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="urgencyLevel"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Trạng thái khách
                </span>
              }
              rules={[{ required: true, message: "Chọn độ nóng" }]}
            >
              <Select
                placeholder="Chọn độ nóng"
                className="rounded-xl"
                options={[
                  { value: "HOT", label: "🔥 HOT – Đang cần ngay" },
                  { value: "WARM", label: "☀️ WARM – Đang cân nhắc" },
                  { value: "COOL", label: "❄️ COOL – Tìm hiểu thêm" },
                ]}
              />
            </Form.Item>
          </Col>

          {urg && (
            <Col xs={24}>
              <div
                className="mb-4 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{
                  background: urg.bg,
                  color: urg.color,
                  border: `1px solid ${urg.color}30`,
                }}
              >
                <span>{urg.label}</span>
                <span className="opacity-60 text-xs">
                  – Ưu tiên xử lý theo phân loại này
                </span>
              </div>
            </Col>
          )}

          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="province"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tỉnh / Thành phố
                </span>
              }
              rules={[{ required: !isBuyType }]}
            >
              <Select
                showSearch
                placeholder="Chọn tỉnh thành"
                suffixIcon={<GlobalOutlined className="text-gray-400" />}
                options={provinces.map((p) => ({ label: p, value: p }))}
                className="rounded-xl"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={16}>
            <Form.Item
              name="address"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Địa chỉ chi tiết
                </span>
              }
            >
              <Input
                prefix={<EnvironmentOutlined className="text-gray-400" />}
                placeholder="Số nhà, tên đường, phường/xã..."
                className="rounded-xl"
              />
            </Form.Item>
          </Col>

          {isBuyType && (
            <>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="buyReasonId"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Mục đích mua xe
                    </span>
                  }
                >
                  <Select
                    placeholder="Chọn lý do mua xe"
                    options={buyReasons?.map((r: any) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                    className="rounded-xl"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="dateViewCar"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Ngày xem xe
                    </span>
                  }
                >
                  <DatePicker
                    classNames={{ popup: { root: "mobile-center-picker" } }}
                    className="w-full rounded-xl"
                    format="DD/MM/YYYY"
                    placeholder="Chọn ngày"
                    suffixIcon={<CalendarOutlined className="text-gray-400" />}
                  />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: GIÁM ĐỊNH & PHÁP LÝ (SELL only)                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!isBuyType && (
        <>
          <SectionHeader
            icon={<FileSearchOutlined />}
            title="Giám định & Pháp lý xe"
            color="#8b5cf6"
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
            <Row gutter={[12, 0]}>
              {/* Inspect status */}
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="inspectStatus"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Tình trạng xem xe
                    </span>
                  }
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Chọn trạng thái" className="rounded-xl">
                    <Select.Option value="NOT_INSPECTED">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{" "}
                        Chưa xem xe
                      </span>
                    </Select.Option>
                    <Select.Option value="APPOINTED">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{" "}
                        Hẹn xem xe
                      </span>
                    </Select.Option>
                    <Select.Option value="INSPECTED">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{" "}
                        Đã xem xe
                      </span>
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="inspectorId"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Nhân viên giám định
                    </span>
                  }
                  rules={[{ required: inspectStatus === "INSPECTED" }]}
                >
                  <Select
                    showSearch
                    placeholder="Chọn nhân viên"
                    options={users?.map((u: any) => ({
                      value: u.id,
                      label: u.fullName || u.username,
                    }))}
                    className="rounded-xl"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="inspectDoneDate"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Ngày hoàn tất GĐ
                    </span>
                  }
                  rules={[{ required: inspectStatus === "INSPECTED" }]}
                >
                  <DatePicker
                    classNames={{ popup: { root: "mobile-center-picker" } }}
                    className="w-full rounded-xl"
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    placeholder="Chọn ngày giờ"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="hasFine"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Vi phạm phạt nguội?
                    </span>
                  }
                  valuePropName="checked"
                >
                  <div
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all select-none"
                    style={{
                      background: hasFine ? "#fef2f2" : "#f0fdf4",
                      borderColor: hasFine ? "#fca5a533" : "#86efac33",
                    }}
                    onClick={() => form.setFieldValue("hasFine", !hasFine)}
                  >
                    <div
                      className="w-8 h-4 rounded-full relative transition-colors flex-shrink-0"
                      style={{ background: hasFine ? "#ef4444" : "#22c55e" }}
                    >
                      <div
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                        style={{ left: hasFine ? "calc(100% - 14px)" : "2px" }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: hasFine ? "#ef4444" : "#16a34a" }}
                    >
                      {hasFine ? "⚠️ CÒN VI PHẠM" : "✅ SẠCH"}
                    </span>
                  </div>
                </Form.Item>
              </Col>

              {hasFine && (
                <Col span={24}>
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-4">
                    <Form.Item
                      name="fineNote"
                      label={
                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
                          <WarningOutlined /> Chi tiết lỗi & Số tiền phạt dự
                          kiến
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập chi tiết vi phạm",
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input.TextArea
                        rows={2}
                        className="rounded-xl border-red-200 focus:border-red-400"
                        placeholder="Nhập mã lỗi, ngày vi phạm, địa điểm, số tiền dự kiến..."
                      />
                    </Form.Item>
                  </div>
                </Col>
              )}

              <Col xs={24} sm={12}>
                <Form.Item
                  name="inspectLocation"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Địa điểm giám định
                    </span>
                  }
                  rules={[{ required: inspectStatus === "INSPECTED" }]}
                >
                  <Select
                    placeholder="Chọn nơi xem xe"
                    className="rounded-xl"
                    options={[
                      {
                        value: "Toyota Bình Dương",
                        label: "🏢 Toyota Bình Dương",
                      },
                      { value: "Toyota Mỹ Phước", label: "🏢 Toyota Mỹ Phước" },
                      {
                        value: "Nhà khách hàng",
                        label: "🏠 Tại nhà khách hàng",
                      },
                      {
                        value: "Công ty khách hàng",
                        label: "🏭 Tại công ty khách hàng",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="sellReasonId"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Nhu cầu khách / Lý do bán
                    </span>
                  }
                  rules={[{ required: true }]}
                >
                  <Select
                    placeholder="Chọn lý do hệ thống"
                    dropdownMatchSelectWidth={false}
                    options={sellReasons?.map((r: any) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                    className="rounded-xl"
                  />
                </Form.Item>
              </Col>

              {inspectStatus === "NOT_INSPECTED" && (
                <Col span={24}>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <Form.Item
                      name="notSeenReasonId"
                      label={
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                          Lý do chưa xem xe
                        </span>
                      }
                      rules={[{ required: true }]}
                      className="!mb-0"
                    >
                      <Select
                        options={notSeenReasons?.map((r: any) => ({
                          value: r.id,
                          label: r.name,
                        }))}
                        className="rounded-xl"
                      />
                    </Form.Item>
                  </div>
                </Col>
              )}
            </Row>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: THÔNG SỐ KỸ THUẬT                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<CarOutlined />}
        title="Thông số kỹ thuật xe"
        color="#3b82f6"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="carModelId"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Dòng xe
                </span>
              }
              rules={[{ required: !isBuyType }]}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn dòng xe"
                optionFilterProp="label"
                options={carModels.map((m: any) => ({
                  value: m.id,
                  label: m.name,
                }))}
                className="rounded-xl"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="modelName"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phiên bản / Grade
                </span>
              }
              rules={[{ required: !isBuyType }]}
            >
              <Input
                placeholder="VD: 1.5G, 2.0V, Premium..."
                className="rounded-xl"
              />
            </Form.Item>
          </Col>
          {!isBuyType && (
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="licensePlate"
                label={
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Biển số xe
                  </span>
                }
                rules={[{ required: true }]}
                getValueFromEvent={(e) =>
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 10)
                }
              >
                <Input
                  className="rounded-xl font-bold uppercase tracking-widest text-center text-base"
                  placeholder="30H12345"
                  suffix={<InfoCircleOutlined className="text-gray-300" />}
                />
              </Form.Item>
            </Col>
          )}

          {/* Specs grid */}
          {[
            {
              name: "year",
              label: "Năm sản xuất",
              node: (
                <InputNumber className="w-full rounded-xl" placeholder="2022" />
              ),
            },
            {
              name: "odo",
              label: "Số ODO (km)",
              node: (
                <InputNumber
                  className="w-full rounded-xl"
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(v) => v!.replace(/,/g, "")}
                />
              ),
              required: !isBuyType,
            },
            {
              name: "seats",
              label: "Số chỗ ngồi",
              node: <InputNumber className="w-full rounded-xl" />,
              required: !isBuyType,
            },
            {
              name: "color",
              label: "Màu ngoại thất",
              node: (
                <Input className="rounded-xl" placeholder="Trắng, Đen, Đỏ..." />
              ),
              required: !isBuyType,
            },
            {
              name: "interiorColor",
              label: "Màu nội thất",
              node: <Input className="rounded-xl" placeholder="Đen, Be..." />,
              required: !isBuyType,
            },
            {
              name: "engineSize",
              label: "Dung tích ĐC",
              node: <Input className="rounded-xl" placeholder="1.5L" />,
            },
            {
              name: "vin",
              label: "Số khung (VIN)",
              node: (
                <Input
                  className="rounded-xl uppercase font-mono"
                  placeholder="17 ký tự"
                />
              ),
            },
            {
              name: "engineNumber",
              label: "Số máy",
              node: <Input className="rounded-xl uppercase font-mono" />,
            },
          ].map(({ name, label, node, required }) => (
            <Col xs={12} sm={8} md={6} key={name}>
              <Form.Item
                name={name}
                label={
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {label}
                  </span>
                }
                rules={required ? [{ required: true }] : undefined}
              >
                {node}
              </Form.Item>
            </Col>
          ))}

          {/* Select fields */}
          {[
            {
              name: "carType",
              label: "Kiểu dáng",
              options: [
                { value: "SEDAN", label: "🚗 Sedan" },
                { value: "HATCHBACK", label: "🚙 Hatchback" },
                { value: "SUV", label: "🛻 SUV" },
                { value: "PICKUP", label: "🚚 Bán tải" },
                { value: "MPV", label: "🚐 MPV" },
              ],
            },
            {
              name: "origin",
              label: "Xuất xứ",
              options: [
                { value: "VN", label: "🇻🇳 Trong nước" },
                { value: "OTHER", label: "🌏 Nhập khẩu" },
              ],
            },
            {
              name: "transmission",
              label: "Hộp số",
              required: !isBuyType,
              options: [
                { value: "AUTOMATIC", label: "⚙️ Số tự động" },
                { value: "MANUAL", label: "🔧 Số sàn" },
              ],
            },
            {
              name: "fuelType",
              label: "Nhiên liệu",
              required: !isBuyType,
              options: [
                { value: "GASOLINE", label: "⛽ Xăng" },
                { value: "DIESEL", label: "🛢️ Dầu" },
                { value: "HYBRID", label: "🌿 Hybrid" },
                { value: "ELECTRIC", label: "⚡ Điện" },
              ],
            },
            {
              name: "driveTrain",
              label: "Hệ dẫn động",
              required: !isBuyType,
              options: [
                { value: "FWD", label: "Cầu trước (FWD)" },
                { value: "RWD", label: "Cầu sau (RWD)" },
                { value: "AWD", label: "4 bánh (AWD)" },
                { value: "4WD", label: "2 cầu (4WD)" },
              ],
            },
          ].map(({ name, label, options, required }) => (
            <Col xs={12} sm={8} md={6} key={name}>
              <Form.Item
                name={name}
                label={
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {label}
                  </span>
                }
                rules={required ? [{ required: true }] : undefined}
              >
                <Select
                  options={options}
                  placeholder="Chọn..."
                  className="rounded-xl"
                />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3b: ĐÁNH GIÁ & CERTIFIED (khi đã giám định)                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showInspectionDetails && (
        <>
          <SectionHeader
            icon={<SafetyCertificateOutlined />}
            title="Đánh giá chất lượng & Chứng nhận"
            color="#10b981"
          />

          <div className="bg-emerald-50/40 rounded-2xl border border-emerald-100 shadow-sm p-4 sm:p-6 mb-6">
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="conditionGrade"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Phân loại tình trạng
                    </span>
                  }
                  rules={[
                    { required: true, message: "Vui lòng đánh giá hạng xe" },
                  ]}
                >
                  <Select
                    placeholder="Chọn mức độ (1–5)"
                    allowClear
                    className="rounded-xl"
                  >
                    {conditionOptions.map((item) => (
                      <Select.Option key={item} value={item}>
                        <span className="text-sm">{item}</span>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="isCertified"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Chứng nhận T-Sure Certified?
                    </span>
                  }
                  valuePropName="checked"
                  initialValue={false}
                >
                  <div
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all select-none"
                    style={{
                      background: isCertified ? "#ecfdf5" : "#fef2f2",
                      borderColor: isCertified ? "#6ee7b733" : "#fca5a533",
                    }}
                    onClick={() =>
                      form.setFieldValue("isCertified", !isCertified)
                    }
                  >
                    <div
                      className="w-8 h-4 rounded-full relative flex-shrink-0 transition-colors"
                      style={{
                        background: isCertified ? "#10b981" : "#ef4444",
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                        style={{
                          left: isCertified ? "calc(100% - 14px)" : "2px",
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: isCertified ? "#059669" : "#dc2626" }}
                    >
                      {isCertified ? "✅ ĐẠT CHUẨN" : "❌ KHÔNG ĐẠT"}
                    </span>
                  </div>
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="certificationNote"
                  label={
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Ghi chú / Lý do đạt hoặc không đạt chuẩn
                    </span>
                  }
                  rules={[
                    {
                      required: !isCertified,
                      message: "Vui lòng ghi rõ lý do nếu không đạt",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={2}
                    className="rounded-xl"
                    placeholder="VD: Xe đạt chuẩn T-Sure Gold / Có vết đâm nhẹ ở cản sau..."
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: TÀI CHÍNH & HẠN ĐỊNH                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<DollarOutlined />}
        title="Tài chính & Hạn định pháp lý"
        color="#f59e0b"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="expectedPrice"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Giá khách mong muốn
                </span>
              }
            >
              <InputNumber
                className="w-full rounded-xl"
                addonAfter="VNĐ"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v!.replace(/,/g, "")}
                placeholder="0"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="tSurePrice"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Định giá T-Sure dự kiến
                </span>
              }
            >
              <InputNumber
                className="w-full rounded-xl"
                addonAfter="VNĐ"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => v!.replace(/,/g, "")}
                placeholder="0"
              />
            </Form.Item>
          </Col>

          {!isBuyType && (
            <Col xs={24} sm={8}>
              <Form.Item
                name="ownerType"
                label={
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Hình thức sở hữu
                  </span>
                }
                rules={[{ required: true }]}
              >
                <Select
                  className="rounded-xl"
                  options={[
                    { label: "👤 Chính chủ", value: "PERSONAL" },
                    { label: "📝 Ủy quyền L1", value: "AUTHORIZATION_L1" },
                    { label: "📝 Ủy quyền L2", value: "AUTHORIZATION_L2" },
                    { label: "🏢 Công ty / VAT", value: "COMPANY_VAT" },
                  ]}
                />
              </Form.Item>
            </Col>
          )}

          {/* Insurance / Registration cards */}
          {[
            {
              switchName: "insuranceregistrationDeadline",
              deadlineName: "registrationDeadline",
              label: "Đăng kiểm",
              onLabel: "CÒN HẠN",
              offLabel: "HẾT / KHÔNG CÓ",
              color: "#3b82f6",
              val: insuranceregistrationDeadline,
              extra: null,
            },
            {
              switchName: "insuranceTNDS",
              deadlineName: "insuranceTNDSDeadline",
              label: "Bảo hiểm TNDS",
              onLabel: "CÒN HẠN",
              offLabel: "HẾT / KHÔNG CÓ",
              color: "#8b5cf6",
              val: insuranceTNDS,
              extra: {
                name: "insuranceDSCorp",
                placeholder: "VD: Bảo Việt, Liberty, PVI...",
              },
            },
            {
              switchName: "insuranceVC",
              deadlineName: "insuranceVCDeadline",
              label: "Bảo hiểm vật chất",
              onLabel: "CÒN HẠN",
              offLabel: "HẾT / KHÔNG CÓ",
              color: "#f97316",
              val: insuranceVC,
              extra: {
                name: "insuranceVCCorp",
                placeholder: "VD: Bảo Việt, Liberty, PVI...",
              },
            },
          ].map(
            ({
              switchName,
              deadlineName,
              label,
              onLabel,
              offLabel,
              color,
              val,
              extra,
            }) => (
              <Col xs={24} sm={8} key={switchName}>
                <div
                  className="rounded-2xl border p-3 mb-4 transition-all"
                  style={{
                    borderColor: val ? `${color}40` : "#e5e7eb",
                    background: val ? `${color}08` : "#fafafa",
                  }}
                >
                  <Form.Item
                    name={switchName}
                    label={
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {label}
                      </span>
                    }
                    valuePropName="checked"
                    className="!mb-0"
                  >
                    <div
                      className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-all"
                      style={{ background: val ? `${color}18` : "#f1f5f9" }}
                      onClick={() => form.setFieldValue(switchName, !val)}
                    >
                      <div
                        className="w-8 h-4 rounded-full relative flex-shrink-0 transition-colors"
                        style={{ background: val ? color : "#d1d5db" }}
                      >
                        <div
                          className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                          style={{ left: val ? "calc(100% - 14px)" : "2px" }}
                        />
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: val ? color : "#9ca3af" }}
                      >
                        {val ? onLabel : offLabel}
                      </span>
                    </div>
                  </Form.Item>

                  {val && (
                    <div className="mt-3 space-y-2 animate-fadeIn">
                      {extra && (
                        <Form.Item
                          name={extra.name}
                          label={
                            <span className="text-xs text-gray-500">
                              Đơn vị bảo hiểm
                            </span>
                          }
                          rules={[
                            {
                              required: true,
                              message: "Nhập tên hãng bảo hiểm",
                            },
                          ]}
                          className="!mb-2"
                        >
                          <Input
                            className="rounded-xl text-sm"
                            placeholder={extra.placeholder}
                          />
                        </Form.Item>
                      )}
                      <Form.Item
                        name={deadlineName}
                        label={
                          <span className="text-xs text-gray-500">
                            Ngày hết hạn
                          </span>
                        }
                        rules={[
                          { required: true, message: "Chọn ngày hết hạn" },
                        ]}
                        className="!mb-0"
                      >
                        <DatePicker
                          classNames={{
                            popup: { root: "mobile-center-picker" },
                          }}
                          className="w-full rounded-xl"
                          format="DD/MM/YYYY"
                          placeholder="Chọn ngày"
                        />
                      </Form.Item>
                    </div>
                  )}
                </div>
              </Col>
            ),
          )}

          <Col xs={24}>
            <Form.Item
              name="note"
              label={
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ghi chú tổng quát tình trạng xe
                </span>
              }
            >
              <Input.TextArea
                rows={3}
                className="rounded-xl"
                placeholder="Mô tả lỗi kỹ thuật, thân vỏ hoặc ghi chú quan trọng khác..."
              />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: HÌNH ẢNH & TÀI LIỆU                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {!isBuyType && (
        <>
          <SectionHeader
            icon={<PictureOutlined />}
            title="Hình ảnh & Chứng từ gốc"
            color="#ec4899"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Car images */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <CarOutlined className="text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Ảnh xe thực tế
                </span>
                {carImages.length > 0 && (
                  <Badge
                    count={carImages.filter((f) => f.status === "done").length}
                    style={{ background: "#10b981" }}
                    className="ml-auto"
                  />
                )}
              </div>

              <Form.Item
                name="carImages"
                rules={[
                  {
                    required: inspectStatus === "INSPECTED",
                    message: "Vui lòng tải ảnh xe",
                  },
                ]}
                className="!mb-0"
              >
                <UploadZone
                  accept="image/*"
                  multiple
                  onUpload={handleCarImageUpload}
                  label="Chạm để tải ảnh xe"
                  hint="JPG, PNG, WebP – tối đa 10MB/file"
                />
              </Form.Item>

              <FilePreviewGrid
                files={carImages}
                onRemove={removeFile(setCarImages, "carImages")}
              />

              {carImages.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Chưa có ảnh nào được tải lên
                </p>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <FilePdfOutlined className="text-rose-500" />
                <span className="text-sm font-semibold text-gray-700">
                  Hồ sơ & Chứng từ
                </span>
                {documents.length > 0 && (
                  <Badge
                    count={documents.filter((f) => f.status === "done").length}
                    style={{ background: "#10b981" }}
                    className="ml-auto"
                  />
                )}
              </div>

              <Form.Item
                name="documents"
                rules={[
                  {
                    required: inspectStatus === "INSPECTED",
                    message: "Vui lòng tải hồ sơ xe",
                  },
                ]}
                className="!mb-0"
              >
                <UploadZone
                  accept="image/*,application/pdf"
                  multiple
                  onUpload={handleDocumentUpload}
                  label="Chạm để tải hồ sơ"
                  hint="Đăng kiểm, cà vẹt, bảo hiểm – JPG hoặc PDF"
                />
              </Form.Item>

              <FilePreviewGrid
                files={documents}
                onRemove={removeFile(setDocuments, "documents")}
              />

              {documents.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Chưa có tài liệu nào được tải lên
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
