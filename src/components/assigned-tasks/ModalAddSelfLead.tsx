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
  Divider,
  Typography,
  Space,
  Alert,
  InputNumber,
  Badge,
  Spin,
  Empty,
} from "antd";
import {
  UserAddOutlined,
  PhoneOutlined,
  CarOutlined,
  BarcodeOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { Role } from "@prisma/client";
import { getInventoryCarsAction } from "@/actions/car-actions"; // Import action

const { Text } = Typography;
const { Option } = Select;

interface ModalAddSelfLeadProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: (values: any) => void;
  loading: boolean;
  carModels: any[];
  currentUser: any;
}

export default function ModalAddSelfLead({
  isOpen,
  onClose,
  onFinish,
  loading,
  carModels,
  currentUser,
}: ModalAddSelfLeadProps) {
  const [form] = Form.useForm();
  const watchType = Form.useWatch("type", form);

  // Trạng thái lưu danh sách xe lấy từ API
  const [inventory, setInventory] = useState<any[]>([]);
  const [fetchingCars, setFetchingCars] = useState(false);

  // 1. Logic lấy danh sách xe khi mở Modal
  useEffect(() => {
    const fetchInventory = async () => {
      setFetchingCars(true);
      const res = await getInventoryCarsAction();
      if (res.success) {
        setInventory(res.data || []);
      }
      setFetchingCars(false);
    };

    if (isOpen) {
      fetchInventory();
      // Set giá trị mặc định dựa trên Role
      const defaultType =
        currentUser?.role === Role.PURCHASE_STAFF ? "SELL" : "BUY";
      form.setFieldsValue({ type: defaultType });
    }
  }, [isOpen, currentUser, form]);

  // 2. Hàm xử lý khi chọn xe từ kho
  const handleSelectInventoryCar = (carId: string) => {
    const selectedCar = inventory.find((c) => c.id === carId);
    if (selectedCar) {
      form.setFieldsValue({
        carModelId: selectedCar.carModelId,
        carYear: selectedCar.year,
        budget: selectedCar.sellingPrice,
      });
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined className="text-blue-600" />
          <span className="uppercase font-bold">
            Thêm khách hàng mới của tôi
          </span>
        </Space>
      }
      open={isOpen}
      onOk={() => form.submit()}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={loading}
      width={700}
      okText="Tạo khách hàng & Nhận chăm sóc"
      centered
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label="Họ và tên khách hàng"
              rules={[{ required: true, message: "Nhập tên khách hàng" }]}
            >
              <Input
                placeholder="VD: Nguyễn Văn A"
                prefix={<UserAddOutlined className="text-gray-400" />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: "Nhập số điện thoại" },
                {
                  pattern: /^[0-9]{10}$/,
                  message: "SĐT phải có đúng 10 chữ số",
                },
              ]}
            >
              <Input
                placeholder="0123456789"
                maxLength={10}
                prefix={<PhoneOutlined className="text-gray-400" />}
                onChange={(e) =>
                  form.setFieldValue("phone", e.target.value.replace(/\D/g, ""))
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="type" label="Nhu cầu khách hàng">
              <Select className="w-full" disabled={isLocked(currentUser)}>
                <Option value="BUY">Mua xe (NV Bán hàng)</Option>
                <Option value="SELL">Bán xe (NV Thu mua)</Option>
              </Select>
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
                      { value: "COMMUNITY", label: "🏛️ Diễn đàn / Hội nhóm" },
                    ],
                  },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider plain>
          <CarOutlined /> Thông tin nhu cầu chi tiết
        </Divider>

        {/* CHỌN XE TỪ KHO - Chỉ hiện khi chọn MUA */}
        {watchType === "BUY" && (
          <Form.Item
            name="inventoryCarId"
            label={
              <Text strong className="text-blue-600 italic">
                Chọn xe đang có sẵn trong kho (Nếu có)
              </Text>
            }
          >
            <Select
              placeholder="Tìm theo Mã kho hoặc Tên xe..."
              showSearch
              allowClear
              loading={fetchingCars}
              optionFilterProp="children"
              onChange={handleSelectInventoryCar}
              prefix={<BarcodeOutlined />}
              notFoundContent={
                fetchingCars ? (
                  <Spin size="small" />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Không có xe sẵn sàng bán"
                  />
                )
              }
            >
              {inventory.map((car) => (
                <Option key={car.id} value={car.id}>
                  <div className="flex justify-between w-full">
                    <span>
                      <Badge status="success" className="mr-2" />
                      <Text strong>{car.stockCode}</Text> - {car.modelName} (
                      {car.year})
                    </span>
                    <Text type="secondary">
                      {Number(car.sellingPrice).toLocaleString()} đ
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="carModelId"
              label="Dòng xe quan tâm"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn dòng xe quan tâm!",
                },
              ]}
            >
              <Select placeholder="Chọn dòng xe" showSearch>
                {carModels.map((m) => (
                  <Option key={m.id} value={m.id}>
                    {m.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="carYear"
              label="Đời xe / Năm SX"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập năm SX!",
                },
              ]}
            >
              <Input placeholder="VD: 2022" />
            </Form.Item>
          </Col>
        </Row>

        {watchType === "BUY" ? (
          <></>
        ) : (
          // <Form.Item
          //   name="budget"
          //   label="Ngân sách dự kiến"
          //   rules={[
          //     {
          //       required: true,
          //       message: "Vui lòng nhập ngân sách dự kiến!",
          //     },
          //   ]}
          // >
          //   <InputNumber
          //     className="w-full!"
          //     placeholder="VD: 600,000,000"
          //     formatter={(value) =>
          //       `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          //     }
          //     parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
          //     addonAfter="VNĐ"
          //   />
          // </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="licensePlate"
                label="Biển số xe"
                getValueFromEvent={(e) =>
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 9)
                }
                rules={[
                  { required: true, message: "Vui lòng nhập biển số xe!" },
                ]}
              >
                <Input placeholder="VD: 51G12345" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedPrice" label="Giá khách muốn bán">
                <InputNumber
                  className="w-full!"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item name="note" label="Ghi chú thêm">
          <Input.TextArea
            rows={3}
            placeholder="Ghi chú nhanh về tình trạng khách hàng..."
          />
        </Form.Item>

        <Alert
          type="info"
          showIcon
          message={`Hệ thống sẽ tự động gán khách hàng này cho bạn`}
        />
      </Form>
    </Modal>
  );
}

// Hàm helper để check lock role
function isLocked(user: any) {
  return user?.role === Role.SALES_STAFF || user?.role === Role.PURCHASE_STAFF;
}
