/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Typography,
  Divider,
  Space,
  Alert,
} from "antd";
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { LeadStatus } from "@prisma/client";

const { Text } = Typography;

interface ModalLoseLeadProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: (values: any) => void;
  loading: boolean;
  selectedLead: any;
  reasons: any[];
  onStatusChange: (status: LeadStatus) => void;
}

export default function ModalLoseLead({
  isOpen,
  onClose,
  onFinish,
  loading,
  selectedLead,
  reasons,
  onStatusChange,
}: ModalLoseLeadProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    console.log(selectedLead);

    if (isOpen) {
      // 1. Chỉ set giá trị mặc định lên giao diện
      form.setFieldsValue({ status: "LOSE" });

      // 2. Chỉ gọi API lấy lý do 1 lần duy nhất khi mở modal
      onStatusChange("LOSE" as LeadStatus);
    } else {
      form.resetFields();
    }
    // QUAN TRỌNG: Loại bỏ onStatusChange khỏi mảng này
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form]);

  // Khi đổi trạng thái (Lose/Frozen...), cần xóa lý do cũ đã chọn
  const handleStatusChange = (value: LeadStatus) => {
    form.setFieldsValue({ reasonId: undefined }); // Reset lý do khi đổi mục tiêu
    if (onStatusChange) {
      onStatusChange(value);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={loading}
      okButtonProps={{ danger: true, className: "rounded-lg h-10" }}
      cancelButtonProps={{ className: "rounded-lg h-10" }}
      okText="Gửi yêu cầu phê duyệt"
      title={
        <Space>
          <ExclamationCircleOutlined className="text-red-500" />
          <span className="uppercase font-bold text-slate-700">
            Dừng xử lý hồ sơ khách hàng
          </span>
        </Space>
      }
      centered
      width={520}
    >
      <Alert
        className="mb-6 mt-2 rounded-xl"
        message={
          <Text strong className="text-red-800">
            Hồ sơ: {selectedLead?.customer?.fullName || selectedLead?.fullName}
          </Text>
        }
        description={
          <Text className="text-red-600 text-xs">
            Sau khi gửi, hồ sơ sẽ chuyển sang trạng thái <b>Chờ phê duyệt</b>.
            Bạn sẽ không thể thao tác cho đến khi Quản lý duyệt yêu cầu này.
          </Text>
        }
        type="error"
        showIcon
        icon={<InfoCircleOutlined />}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
      >
        <Form.Item
          name="status"
          label={
            <Text strong className="text-slate-600">
              Phân loại lưu trữ:
            </Text>
          }
        >
          <Select
            size="large"
            onChange={handleStatusChange}
            className="w-full"
            options={[
              {
                label: "🔴 LOST - Khách không mua/bán nữa",
                value: "LOSE",
              },
              {
                label: "🟣 Đóng băng (Frozen) - Tạm dừng chăm sóc",
                value: "FROZEN",
              },
              {
                label: "🟡 Chờ xem xe (Pending View) - Đang sắp xếp lịch",
                value: "PENDING_VIEW",
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="reasonId"
          label={
            <Text strong className="text-slate-600">
              Lý do cụ thể (Do Admin cấu hình):
            </Text>
          }
          rules={[{ required: true, message: "Vui lòng chọn lý do cụ thể" }]}
        >
          <Select
            size="large"
            placeholder={
              reasons.length > 0
                ? "Chọn lý do từ danh sách..."
                : "admin chưa setup lý do"
            }
            options={reasons.map((r) => ({ label: r.content, value: r.id }))}
            showSearch
            optionFilterProp="label"
            loading={reasons.length === 0}
            notFoundContent={
              reasons.length === 0 ? (
                <Space>
                  <LoadingOutlined /> Đang tải lý do...
                </Space>
              ) : (
                "Không tìm thấy lý do"
              )
            }
          />
        </Form.Item>

        <Divider className="my-4" />

        <Form.Item
          name="note"
          label={
            <Text strong className="text-slate-600">
              Giải trình chi tiết với Quản lý:
            </Text>
          }
          rules={[
            {
              required: true,
              message: "Vui lòng nhập giải trình chi tiết để Admin dễ duyệt",
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Ví dụ: Khách báo giá cao hơn thị trường 50 triệu, không thương lượng được..."
            className="rounded-lg shadow-sm"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
