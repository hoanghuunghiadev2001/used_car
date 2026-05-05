/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Typography,
  Tag,
  message,
  Tooltip,
  Input,
  Select,
  Card,
  Badge,
} from "antd";
import {
  AlertOutlined,
  MailOutlined,
  StopOutlined,
  SearchOutlined,
  UserOutlined,
  SyncOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getOverdueCustomersAction,
  freezeOverdueCustomersAction,
  sendReminderEmailAction,
} from "@/actions/customer-actions";

const { Text, Title } = Typography;

export default function LeadsOverdueModal({
  open,
  onClose,
  onViewDetail,
}: any) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // State quản lý bộ lọc
  const [filters, setFilters] = useState({
    name: "",
    staffName: "",
    type: undefined,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOverdueCustomersAction(filters);
      setCustomers(data);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const handleSendMail = async (ids: string[]) => {
    setLoading(true);
    const res = await sendReminderEmailAction(ids);
    if (res.success) message.success("Đã gửi email nhắc nhở thành công");
    setLoading(false);
  };

  // Hành động xử lý
  const handleFreeze = async (ids: string[]) => {
    Modal.confirm({
      title: "Xác nhận đóng băng hồ sơ?",
      content: `Có ${ids.length} khách hàng sẽ được chuyển sang trạng thái ĐÓNG BĂNG.`,
      okText: "Đóng băng ngay",
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await freezeOverdueCustomersAction(ids);
        if (res.success) {
          message.success("Đã thực hiện đóng băng");
          loadData();
          setSelectedRowKeys([]);
        }
      },
    });
  };

  const columns = [
    {
      title: "Thông tin khách hàng",
      key: "info",
      render: (r: any) => (
        <div className="flex flex-col">
          <Text strong className="text-[#1a1a1a]">
            {r.fullName}
          </Text>
          <Text type="secondary" className="text-[12px]">
            {r.phone}
          </Text>
        </div>
      ),
    },
    {
      title: "Loại GD",
      dataIndex: "type",
      render: (type: string) => {
        const map: any = {
          SELL: { color: "blue", label: "Bán" },
          BUY: { color: "green", label: "Mua" },
          SELL_TRADE_USED: { color: "orange", label: "Trao đổi cũ" },
          SELL_TRADE_NEW: { color: "purple", label: "Đổi xe mới" },
        };
        const item = map[type] || { color: "default", label: type };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: "Thời gian quá hạn",
      render: (r: any) => {
        const days = dayjs().diff(dayjs(r.createdAt), "day");
        return (
          <div className="flex items-center gap-2">
            <Badge status={days > 90 ? "error" : "warning"} />
            <Text
              strong
              className={days > 90 ? "text-red-600" : "text-orange-600"}
            >
              {days} ngày
            </Text>
          </div>
        );
      },
    },
    {
      title: "Nhân viên đảm nhận",
      render: (r: any) => (
        <Space direction="vertical" size={0}>
          <Text>
            <UserOutlined className="mr-1 text-gray-400" />{" "}
            {r.assignedTo?.fullName || "N/A"}
          </Text>
          <Text type="secondary" className="text-[11px]">
            {r.branch?.name}
          </Text>
        </Space>
      ),
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (r: any) => (
        <Space>
          <Tooltip title="Chi tiết">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onViewDetail(r)}
            />
          </Tooltip>
          <Tooltip title="Đóng băng">
            <Button
              size="small"
              type="text"
              danger
              icon={<StopOutlined />}
              onClick={() => handleFreeze([r.id])}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1100}
      footer={null}
      centered
      title={null} // Tùy chỉnh header bên trong body cho đẹp hơn
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 flex items-center justify-center rounded-xl">
            <AlertOutlined className="text-red-500 text-xl" />
          </div>
          <div>
            <Title level={4} className="!mb-0">
              Hồ sơ quá hạn tích tụ
            </Title>
            <Text type="secondary">
              Cảnh báo khách hàng chưa chốt sau 60 ngày
            </Text>
          </div>
        </div>
        <Button icon={<SyncOutlined spin={loading} />} onClick={loadData}>
          Cập nhật
        </Button>
      </div>

      {/* THANH BỘ LỌC */}
      <Card className="mb-4 bg-gray-50 border-none shadow-sm" size="small">
        <div className="flex flex-wrap gap-4 items-center">
          <Input
            placeholder="Tên khách hàng..."
            prefix={<SearchOutlined className="text-gray-400" />}
            className="w-48"
            allowClear
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <Input
            placeholder="Tên nhân viên..."
            prefix={<UserOutlined className="text-gray-400" />}
            className="w-48"
            allowClear
            onChange={(e) =>
              setFilters({ ...filters, staffName: e.target.value })
            }
          />
          <Select
            placeholder="Loại khách hàng"
            className="w-40"
            allowClear
            onChange={(val) => setFilters({ ...filters, type: val })}
            options={[
              { label: "Mua xe", value: "BUY" },
              { label: "Bán xe", value: "SELL" },
              { label: "Trao đổi mới", value: "SELL_TRADE_NEW" },
              { label: "Trao đổi cũ", value: "SELL_TRADE_USED" },
            ]}
          />
        </div>
      </Card>

      {/* XỬ LÝ HÀNG LOẠT */}
      {selectedRowKeys.length > 0 && (
        <div className="mb-4 flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-1">
          <Text strong className="text-blue-700">
            Đã chọn {selectedRowKeys.length} hồ sơ:
          </Text>
          <Space>
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={() => handleSendMail(selectedRowKeys as string[])}
            >
              Gửi Mail nhắc nhở
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => handleFreeze(selectedRowKeys as string[])}
            >
              Đóng băng hàng loạt
            </Button>
          </Space>
        </div>
      )}

      <Table
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        columns={columns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        className="premium-table border rounded-xl overflow-hidden"
        pagination={{
          pageSize: 8,
          showTotal: (total) => `Tổng cộng ${total} khách hàng`,
        }}
        scroll={{ y: 450 }}
      />
    </Modal>
  );
}
