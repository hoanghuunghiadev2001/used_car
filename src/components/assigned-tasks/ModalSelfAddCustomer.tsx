/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  InputNumber,
  Divider,
  Space,
  Typography,
  Button,
} from "antd";
import {
  UserAddOutlined,
  CarOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  WarningFilled,
  PhoneOutlined,
  FontSizeOutlined,
  SwapOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { selfCreateCustomerAction } from "@/actions/task-actions";

const { Title, Text } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  carModels: any[];
  onSuccess: () => void;
}

export default function ModalSelfAddCustomer({
  isOpen,
  onClose,
  carModels,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // --- THEO DÕI LOẠI GIAO DỊCH ĐỂ ẨN HIỆN TRƯỜNG ĐỔI XE ---
  const transactionType = Form.useWatch("type", form);
  const isTradeIn =
    transactionType === "SELL_TRADE_NEW" ||
    transactionType === "SELL_TRADE_USED";

  const showNotification = (
    type: "success" | "error" | "warning",
    msg: string,
  ) => {
    const isSuccess = type === "success";
    const isWarning = type === "warning";

    Modal[type]({
      icon: null,
      width: 480,
      centered: true,
      okText: "Đã hiểu",
      okButtonProps: {
        size: "large",
        type: "primary",
        className: isSuccess
          ? "bg-emerald-600"
          : isWarning
            ? "bg-amber-500"
            : "bg-red-600",
      },
      content: (
        <div className="text-center py-6">
          <div className="mb-6">
            {isSuccess && (
              <CheckCircleFilled style={{ fontSize: 72, color: "#10b981" }} />
            )}
            {isWarning && (
              <WarningFilled style={{ fontSize: 72, color: "#f59e0b" }} />
            )}
            {type === "error" && (
              <CloseCircleFilled style={{ fontSize: 72, color: "#ef4444" }} />
            )}
          </div>
          <Title level={3} className="mb-3 tracking-tight">
            {isSuccess
              ? "THÀNH CÔNG"
              : isWarning
                ? "DỮ LIỆU TRÙNG LẶP"
                : "CÓ LỖI XẢY RA"}
          </Title>
          <div className="px-4">
            <Text className="text-gray-500 text-lg leading-relaxed">
              {isSuccess
                ? "Hồ sơ khách hàng đã được khởi tạo thành công."
                : msg}
            </Text>
          </div>
        </div>
      ),
    });
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await selfCreateCustomerAction(values);
      if (res.success) {
        onClose();
        showNotification("success", "");
        form.resetFields();
        onSuccess();
      } else {
        showNotification(
          "warning",
          (res as any).error || "Dữ liệu đã tồn tại.",
        );
      }
    } catch (error: any) {
      showNotification("error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space size={12} className="py-2">
          <div className="bg-blue-600 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <UserAddOutlined className="text-white text-xl" />
          </div>
          <div className="flex flex-col">
            <Text className="uppercase font-black text-slate-800 tracking-wider">
              Tạo Hồ Sơ Khách Hàng
            </Text>
            <Text className="text-[10px] text-blue-500 font-bold uppercase italic">
              Chế độ: Tự khai thác
            </Text>
          </div>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={800}
      centered
      okText="Xác nhận & Lưu hồ sơ"
      cancelText="Hủy bỏ"
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ type: "SELL" }}
        autoComplete="off"
        className="mt-6"
        requiredMark="optional"
      >
        {/* KHỐI 1: THÔNG TIN KHÁCH HÀNG */}
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 mb-6">
          <Divider titlePlacement="left" plain className="m-0! mb-5!">
            <Space className="text-slate-400 uppercase text-[11px] font-bold tracking-widest">
              <InfoCircleOutlined /> Thông tin định danh
            </Space>
          </Divider>
          <Row gutter={20}>
            <Col xs={24} md={12}>
              <Form.Item
                name="fullName"
                label={
                  <Text strong className="text-slate-600">
                    Họ và tên khách hàng
                  </Text>
                }
                rules={[{ required: true, message: "Bắt buộc nhập tên khách" }]}
              >
                <Input
                  prefix={<FontSizeOutlined className="text-slate-300" />}
                  placeholder="Nguyễn Văn A"
                  size="large"
                  className="rounded-xl"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label={
                  <Text strong className="text-slate-600">
                    Số điện thoại
                  </Text>
                }
                rules={[
                  { required: true, message: "Bắt buộc nhập SĐT" },
                  { pattern: /^[0-9]{10,11}$/, message: "SĐT không hợp lệ" },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined className="text-slate-300" />}
                  placeholder="09xx xxx xxx"
                  size="large"
                  className="rounded-xl"
                  max={10}
                  maxLength={10}
                  onChange={(e) =>
                    form.setFieldsValue({
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* KHỐI 2: LOẠI HÌNH GIAO DỊCH */}
        <div className="p-5">
          <Row gutter={20}>
            <Col xs={24} md={12}>
              <Form.Item
                name="type"
                label={
                  <Text strong className="text-slate-600">
                    Loại hình giao dịch
                  </Text>
                }
                rules={[{ required: true }]}
              >
                <Select
                  size="large"
                  className="w-full"
                  options={[
                    { value: "SELL", label: "🤝 Thu mua xe (Khách bán)" },
                    {
                      value: "SELL_TRADE_NEW",
                      label: "♻️ Thu cũ - Đổi xe mới",
                    },
                    {
                      value: "SELL_TRADE_USED",
                      label: "🔄 Thu cũ - Đổi xe cũ",
                    },
                    { value: "VALUATION", label: "⚖️ Định giá xe" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="licensePlate"
                label={
                  <Text strong className="text-slate-600">
                    Biển số phương tiện
                  </Text>
                }
                rules={[{ required: true, message: "Bắt buộc nhập biển số" }]}
                getValueFromEvent={(e) =>
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                }
              >
                <Input
                  size="large"
                  placeholder="VD: 51H12345"
                  maxLength={9}
                  className="uppercase font-bold text-blue-600 rounded-xl"
                />
              </Form.Item>
            </Col>
          </Row>
          <Col xs={24} md={12}>
            <Form.Item
              name="carModelId"
              label={
                <Text strong className="text-slate-600">
                  Dòng xe khách hàng
                </Text>
              }
              rules={[
                { required: true, message: "Chọn dòng xe khách đang đi" },
              ]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Innova, Camry, Vios..."
                optionFilterProp="label"
                options={carModels.map((m) => ({ label: m.name, value: m.id }))}
                className="rounded-xl"
              />
            </Form.Item>
          </Col>

          {/* HIỆN THỊ KHI CHỌN THU CŨ ĐỔI MỚI/CŨ */}
          {isTradeIn && (
            <div className="animate-fadeIn p-4 bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-200 mb-6 mt-2">
              <Form.Item
                name="tradeInModelId"
                label={
                  <Text strong className="text-indigo-600">
                    <SwapOutlined /> Dòng xe khách muốn đổi sang
                  </Text>
                }
                rules={[
                  { required: true, message: "Vui lòng chọn dòng xe muốn đổi" },
                ]}
              >
                <Select
                  size="large"
                  showSearch
                  placeholder="Chọn model xe mới/cũ muốn đổi..."
                  optionFilterProp="label"
                  options={carModels.map((m) => ({
                    label: m.name,
                    value: m.id,
                  }))}
                  className="rounded-xl"
                />
              </Form.Item>
            </div>
          )}
        </div>

        {/* KHỐI 3: THÔNG TIN XE HIỆN TẠI */}
        <Divider titlePlacement="left" plain className="my-4!">
          <Space className="text-slate-400 uppercase text-[11px] font-bold tracking-widest">
            <CarOutlined /> Chi tiết xe khách đang đi
          </Space>
        </Divider>

        <Row gutter={20}>
          <Col xs={12} md={6}>
            <Form.Item
              name="carYear"
              label={
                <Text strong className="text-slate-600">
                  Năm sản xuất
                </Text>
              }
              rules={[{ required: true, message: "Chọn năm" }]}
            >
              <InputNumber
                className="w-full! rounded-xl"
                size="large"
                placeholder="2022"
                min={1990}
                max={2026}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="expectedPrice"
              label={
                <Text strong className="text-slate-600">
                  Giá mong muốn
                </Text>
              }
              rules={[{ required: true, message: "Nhập giá" }]}
            >
              <InputNumber
                className="w-full! rounded-xl"
                size="large"
                placeholder="VNĐ"
                formatter={(val) =>
                  `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(val) => val!.replace(/\$\s?|(,*)/g, "")}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="source"
              label={
                <Text strong className="text-slate-600">
                  Nguồn chi tiết
                </Text>
              }
              rules={[
                { required: true, message: "Vui lòng chọn nguồn khách hàng!" },
              ]}
            >
              <Select
                className="w-full"
                size="large"
                placeholder="Chọn nguồn khách hàng"
                showSearch
                optionFilterProp="label"
                options={[
                  {
                    label: (
                      <span className="font-bold text-blue-600">
                        🏢 NGUỒN CÔNG TY (DLr)
                      </span>
                    ),
                    options: [
                      {
                        value: "FACEBOOK_ADS",
                        label: "🔵 Fanpage công ty",
                      },
                      {
                        value: "LEAD_TMV",
                        label: "💬 Lead TMV (Từ Toyota VN)",
                      },
                      {
                        value: "WEBSITE_COMPANY",
                        label: "🌐 Website công ty",
                      },
                      { value: "ZALO_OA", label: "💬 Zalo OA (Công ty)" },
                      {
                        value: "YOUTUBE_COMPANY",
                        label: "🔴 Youtube công ty",
                      },
                      { value: "TIKTOK_COMPANY", label: "🎵 Tiktok công ty" },
                      { value: "GOOGLE_MAPS", label: "📍 Google Maps" },
                      { value: "SHROOM", label: "🍄 Showroom" },
                      { value: "EVENT", label: "🎉 Sự kiện" },
                      { value: "HOTLINE", label: "📞 Hotline" },
                    ],
                  },
                  {
                    label: (
                      <span className="font-bold text-green-600">
                        👤 NGUỒN CÁ NHÂN KHAI THÁC
                      </span>
                    ),
                    options: [
                      { value: "ZALO_PERSONAL", label: "📱 Zalo cá nhân" },
                      {
                        value: "FACEBOOK_PERSONAL",
                        label: "👥 Fanpage cá nhân",
                      },
                      {
                        value: "TIKTOK_PERSONAL",
                        label: "🎥 Tiktok cá nhân",
                      },
                      {
                        value: "YOUTUBE_PERSONAL",
                        label: "🎬 Youtube cá nhân",
                      },
                      {
                        value: "CHOTOT",
                        label: "💬 Chợ Tốt Cá nhân",
                      },
                      {
                        value: "WEBSITE_PERSONAL",
                        label: "💻 Website cá nhân",
                      },
                      {
                        value: "REFERRAL",
                        label: "🤝 Khách hàng cũ (Tái mua/đổi xe)",
                      }, // Tách riêng
                      {
                        value: "BROKER",
                        label: "🔗 Môi giới",
                      },
                      { value: "COMMUNITY", label: "🏛️ Diễn đàn / Hội nhóm" },
                    ],
                  },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="note"
              label={
                <Text strong className="text-slate-600">
                  Ghi chú chi tiết
                </Text>
              }
            >
              <Input.TextArea
                rows={3}
                placeholder="Mô tả tình trạng xe hoặc nhu cầu cụ thể của khách..."
                className="rounded-xl"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
