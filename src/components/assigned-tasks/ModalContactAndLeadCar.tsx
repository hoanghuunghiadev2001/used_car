/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Space,
  Typography,
  Divider,
  ConfigProvider,
  Select,
  Tag,
} from "antd";
import {
  MessageOutlined,
  UserOutlined,
  BellOutlined,
  FireOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
// Import locale tiếng Việt để hiển thị Thứ/Tháng thân thiện
import viVN from "antd/locale/vi_VN";
import "dayjs/locale/vi";

dayjs.locale("vi");

const { Text } = Typography;
const { Option } = Select;
interface ModalContactProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: (values: any) => void;
  loading: boolean;
  selectedLead: any;
}

export default function ModalContactAndLeadCar({
  isOpen,
  onClose,
  onFinish,
  loading,
  selectedLead,
}: ModalContactProps) {
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(false);
  console.log(selectedLead);

  // 1. Nhận diện thiết bị để áp dụng CSS đặc biệt
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset form mỗi khi đóng/mở Modal
  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      if (selectedLead?.customer?.urgencyLevel) {
        form.setFieldValue("urgencyLevel", selectedLead.customer.urgencyLevel);
      }
    }
  }, [isOpen, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Chuẩn hóa dữ liệu sang ISO String trước khi gửi lên Server
      const payload = {
        ...values,
        nextContactAt: values.nextContactAt
          ? values.nextContactAt.toISOString()
          : null,
        note: values.note || "",
        nextContactNote: values.nextContactNote || "",
        urgencyLevel: values.urgencyLevel,
      };

      onFinish(payload);
    } catch (error) {
      console.error("Validate failed:", error);
    }
  };

  return (
    <ConfigProvider locale={viVN}>
      {/* 2. CSS Global để ép DatePicker ra giữa màn hình Mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          /* Đưa khung chọn ngày ra giữa */
          .mobile-center-picker {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 10000 !important; /* Cao hơn Modal */
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
          }

          /* Tạo lớp nền mờ bao phủ toàn bộ phía sau lịch */
          .mobile-center-picker::before {
            content: "";
            position: fixed;
            top: -100vh;
            left: -100vw;
            width: 200vw;
            height: 200vh;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(2px);
            z-index: -1;
          }

          /* Tối ưu các nút trong bảng lịch cho ngón tay */
          .ant-picker-cell-inner {
            min-width: 36px !important;
            height: 36px !important;
            line-height: 36px !important;
          }

          .ant-picker-time-panel-column > li .ant-picker-time-panel-cell-inner {
            height: 38px !important;
            line-height: 38px !important;
          }
        }
      `}</style>

      <Modal
        title={
          <Space>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MessageOutlined className="text-indigo-600 flex" />
            </div>
            <span className="font-bold text-slate-700">GHI NHẬN TƯƠNG TÁC</span>
          </Space>
        }
        open={isOpen}
        onOk={handleSubmit}
        onCancel={onClose}
        confirmLoading={loading}
        okText="Lưu nhật ký"
        cancelText="Hủy bỏ"
        okButtonProps={{ className: "bg-indigo-600 h-10 px-6 rounded-lg" }}
        centered
        width={500}
        // Cho phép các thành phần lơ lửng thoát ra ngoài giới hạn Modal
        style={{ overflow: "visible" }}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          initialValues={{ nextContactAt: null }}
        >
          {/* Header thông tin khách hàng */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
            <Space>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
                <UserOutlined className="text-indigo-500 text-lg" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                  Khách hàng
                </div>
                <Text strong className="text-indigo-900 block leading-tight">
                  {selectedLead?.customer?.fullName ||
                    selectedLead?.fullName ||
                    "Khách chưa định danh"}
                </Text>
              </div>
            </Space>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">
                Liên hệ
              </div>
              <Text className="text-slate-600 font-medium">
                {selectedLead?.customer?.phone || selectedLead?.phone || "---"}
              </Text>
            </div>
          </div>

          {/* TRƯỜNG MỚI: TRẠNG THÁI KHÁCH HÀNG */}
          <Form.Item
            name="urgencyLevel"
            label={
              <span className="font-bold text-slate-700">
                Phân loại khách hàng
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng chọn trạng thái tiềm năng" },
            ]}
          >
            <Select
              placeholder="Chọn mức độ tiềm năng"
              size="large"
              className="w-full"
              suffixIcon={<FireOutlined />}
            >
              <Option value="HOT">
                <Tag color="error" className="font-bold">
                  HOT
                </Tag>
              </Option>
              <Option value="WARM">
                <Tag color="warning" className="font-bold">
                  WARM
                </Tag>
              </Option>
              <Option value="COOL">
                <Tag color="default" className="font-bold">
                  COOL
                </Tag>
              </Option>
            </Select>
          </Form.Item>

          {/* Nội dung tương tác */}
          <Form.Item
            name="note"
            label={
              <span className="font-bold text-slate-700">
                Nội dung cuộc trao đổi
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập nội dung trao đổi" },
              { min: 5, message: "Nội dung quá ngắn" },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Khách quan tâm xe gì? Tài chính thế nào?..."
              className="rounded-lg border-slate-200"
            />
          </Form.Item>

          <Divider className="my-6">
            <Text
              type="secondary"
              className="text-[11px] uppercase font-bold px-2 text-slate-400"
            >
              Nhắc hẹn gọi lại
            </Text>
          </Divider>

          {/* Section nhắc hẹn - Khu vực quan trọng */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-dashed border-amber-200 overflow-visible">
            <div className="flex items-center gap-2 mb-4 text-amber-700 font-bold">
              <BellOutlined />
              <span>Lên lịch chăm sóc tiếp theo</span>
            </div>

            <Form.Item
              name="nextContactAt"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn thời gian hẹn gọi lại",
                },
              ]}
              label={
                <span className="text-amber-800 text-sm">
                  Thời gian hẹn gọi lại
                </span>
              }
              extra={
                <span className="text-[11px] text-amber-600/70">
                  Hệ thống sẽ thông báo cho bạn vào thời gian này
                </span>
              }
            >
              <DatePicker
                // 3. TUYỆT CHIÊU CĂN GIỮA:
                getPopupContainer={() => document.body} // Thoát khỏi Modal
                classNames={{
                  popup: {
                    root: "mobile-center-picker", // Thay cho dropdownClassName
                  },
                }}
                showTime={{ format: "HH:mm", minuteStep: 15 }}
                format="YYYY-MM-DD HH:mm"
                size="large"
                inputReadOnly // Ngăn hiện bàn phím điện thoại
                needConfirm={true} // Bắt buộc bấm OK để xác nhận (tránh chạm nhầm)
                placeholder="Chạm để chọn thời gian"
                placement={isMobile ? "topLeft" : "bottomLeft"} // Desktop hiện dưới, Mobile ưu tiên hiện trên
                style={{ width: "100%", height: "48px" }}
                className="rounded-lg border-amber-200"
              />
            </Form.Item>

            <Form.Item
              name="nextContactNote"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập ghi chú nhắc hẹn",
                },
              ]}
              label={
                <span className="text-amber-800 text-sm">Ghi chú nhắc hẹn</span>
              }
              className="mb-0"
            >
              <Input
                placeholder="Cần chuẩn bị catalog, báo giá..."
                className="h-11 rounded-lg border-amber-200"
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
