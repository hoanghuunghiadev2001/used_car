/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Form,
  Card,
  Input,
  Select,
  Button,
  Row,
  Col,
  message,
  Typography,
  InputNumber,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  SendOutlined,
  AuditOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { createCustomerAction } from "@/actions/customer-actions";
import { useState } from "react";
export const maxDuration = 60; // Tăng timeout cho toàn bộ các action được gọi từ page này
export const dynamic = "force-dynamic";
const { Title, Text } = Typography;

export default function FormSellCar({
  type,
  carModels,
  userRole,
  userId,
  onSuccess,
}: any) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const SELL_SUB_TYPES = [
    { value: "SELL", label: "Chỉ bán xe cũ" },
    { value: "SELL_TRADE_NEW", label: "Bán cũ - Đổi xe mới" },
    { value: "SELL_TRADE_USED", label: "Bán cũ - Đổi xe cũ" },
  ];
  const [typeHandel, setTypeHandel] =
    useState<(typeof SELL_SUB_TYPES)[number]["value"]>("SELL");

  const onFinish = async (values: any) => {
    if (!userId) return message.error("Lỗi phiên đăng nhập");
    setLoading(true);
    // Nếu là VALUATION thì giữ nguyên type, nếu SELL thì lấy giá trị từ Select SubType
    const finalType = type === "VALUATION" ? "VALUATION" : values.type;

    const res = await createCustomerAction({
      ...values,
      type: finalType,
      referrerId: userId,
    });
    if (res?.success) {
      message.success("Gửi thông tin thành công!");
      onSuccess();
    } else {
      message.error(res?.error || "Gửi thất bại");
    }
    setLoading(false);
  };

  return (
    <Card className="shadow-xl rounded-2xl border-none overflow-hidden ">
      <div
        className={`p-4 -mx-6 -mt-6 mb-6 ${type === "SELL" ? "bg-red-600" : "bg-orange-500"}`}
      >
        <Title level={4} className="!text-white !m-0 uppercase text-center">
          {type === "SELL"
            ? "Thông tin ký gửi / Đổi xe"
            : "Yêu cầu định giá xe"}
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        size="large"
        initialValues={{ type: "SELL" }}
      >
        <section className="mb-4">
          <Text
            strong
            className="text-gray-400 text-[11px] uppercase tracking-widest mb-4 block"
          >
            Thông tin khách hàng
          </Text>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="fullName"
                label="Tên khách hàng"
                rules={[{ required: true }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại" },
                  {
                    pattern: /^[0-9]{10}$/,
                    message: "Số điện thoại phải có đúng 10 chữ số",
                  },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined className="text-gray-400" />}
                  placeholder="0901234567"
                  maxLength={10} // Chặn không cho nhập ký tự thứ 11
                  onChange={(e) => {
                    // Chỉ giữ lại các ký tự là số, loại bỏ chữ và ký tự đặc biệt ngay lập tức
                    const value = e.target.value.replace(/\D/g, "");
                    // Cập nhật lại giá trị sạch vào form
                    form.setFieldsValue({ phone: value });
                  }}
                />
              </Form.Item>
            </Col>
            {(userRole === "SALES_STAFF" ||
              userRole === "PURCHASE_STAFF" ||
              userRole === "MANAGER" ||
              userRole === "APPRAISER") && (
              <Col xs={24} md={12}>
                <Form.Item
                  name="source"
                  label={
                    <Text strong className="text-slate-600">
                      Nguồn chi tiết
                    </Text>
                  }
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn nguồn khách hàng!",
                    },
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
                            label: "🔵 Fanpage công ty ",
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
                          {
                            value: "TIKTOK_COMPANY",
                            label: "🎵 Tiktok công ty",
                          },
                          { value: "GOOGLE_MAPS", label: "📍 Google Maps" },
                          { value: "SHROOM", label: "🍄 Shroom" },
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
                            value: "CHOTOT",
                            label: "💬 Chợ Tốt Cá nhân",
                          },
                          {
                            value: "YOUTUBE_PERSONAL",
                            label: "🎬 Youtube cá nhân",
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
                          {
                            value: "COMMUNITY",
                            label: "🏛️ Diễn đàn / Hội nhóm",
                          },
                        ],
                      },
                    ]}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </section>

        <section className="mb-4">
          <Text
            strong
            className="text-gray-400 text-[11px] uppercase tracking-widest mb-4 block"
          >
            Chi tiết xe giới thiệu
          </Text>
          <Row gutter={16}>
            {type === "SELL" && (
              <Col span={24}>
                <Form.Item
                  name="type"
                  label="Hình thức giao dịch"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={SELL_SUB_TYPES}
                    onChange={(e) => {
                      setTypeHandel(e);
                    }}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={12}>
              <Form.Item
                name="licensePlate"
                label="Biển số xe"
                rules={[{ required: true, message: "Bắt buộc để check trùng" }]}
                getValueFromEvent={(e) =>
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                }
              >
                <Input
                  prefix={<AuditOutlined />}
                  placeholder="61A12345"
                  maxLength={9}
                  max={9}
                  className="font-bold text-blue-600"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="carModelId"
                label="Dòng xe cần bán/định giá"
                rules={[{ required: true, message: "Vui lòng chọn dòng xe!" }]}
              >
                <Select
                  showSearch
                  placeholder="Gõ để tìm dòng xe (VD: Vios, Accent...)"
                  optionFilterProp="label" // QUAN TRỌNG: Cho phép search theo label (m.name)
                  filterOption={(input, option) =>
                    String(option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  } // Thêm hàm này để search tiếng Việt không phân biệt hoa thường
                  options={carModels.map((m: any) => ({
                    label: m.name,
                    value: m.id,
                  }))}
                />
              </Form.Item>
            </Col>
            {typeHandel !== "SELL" && (
              <Col xs={24} md={12}>
                <Form.Item
                  name="tradeInModelId"
                  label="Dòng xe khách muốn đổi"
                  rules={[
                    { required: true, message: "Vui lòng chọn dòng xe!" },
                  ]}
                >
                  <Select
                    showSearch
                    placeholder="Gõ để tìm dòng xe (VD: Vios, Accent...)"
                    optionFilterProp="label" // QUAN TRỌNG: Cho phép search theo label (m.name)
                    filterOption={(input, option) =>
                      String(option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    } // Thêm hàm này để search tiếng Việt không phân biệt hoa thường
                    options={carModels.map((m: any) => ({
                      label: m.name,
                      value: m.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}

            <Col xs={24} md={12}>
              <Form.Item
                name="carYear"
                label="Năm sản xuất"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng nhập năm sản xuất!",
                  },
                ]}
              >
                <Input prefix={<CalendarOutlined />} placeholder="Vd: 2019" />
              </Form.Item>
            </Col>
            <Form.Item
              name="expectedPrice"
              label={type === "SELL" ? "Giá muốn bán" : "Giá kỳ vọng"}
            >
              <InputNumber
                style={{ width: "100%" }}
                addonBefore="VNĐ"
                placeholder="Vd: 450.000.000"
                formatter={(value) =>
                  value !== undefined
                    ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    : ""
                }
                parser={(value) => value?.replace(/\./g, "") ?? ""}
              />
            </Form.Item>
          </Row>
        </section>

        <Form.Item
          name="note"
          label="Ghi chú thêm"
          rules={[{ required: true, message: "Nhập ghi chú của khách hàng" }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Tình trạng xe, pháp lý, thời gian xem xe tốt nhất..."
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loading}
          icon={<SendOutlined />}
          className={`h-14 font-bold text-lg rounded-xl border-none ${type === "SELL" ? "bg-red-600" : "bg-orange-500"}`}
        >
          XÁC NHẬN GỬI THÔNG TIN
        </Button>
      </Form>
    </Card>
  );
}
