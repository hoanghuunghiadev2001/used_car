/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Typography,
  Tag,
  message,
  Tooltip,
} from "antd";
import {
  AlertOutlined,
  MailOutlined,
  ManOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getOverdueCustomersAction,
  sendReminderEmailAction,
  freezeOverdueCustomersAction,
} from "@/actions/customer-actions";

const { Text } = Typography;

// Sửa isOpen -> open để khớp với trang cha
export default function LeadsOverdueModal({
  open,
  onClose,
  onViewDetail,
}: any) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOverdueCustomersAction();
      setCustomers(data);
    } catch (error) {
      message.error("Không thể tải danh sách quá hạn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const handleSendMail = async (ids: string[]) => {
    setLoading(true);
    const res = await sendReminderEmailAction(ids);
    if (res.success) message.success("Đã gửi email nhắc nhở thành công");
    setLoading(false);
  };

  const handleFreeze = async (ids: string[]) => {
    Modal.confirm({
      title: "Xác nhận đóng băng?",
      content: `Hệ thống sẽ chuyển ${ids.length} khách hàng sang trạng thái ĐÓNG BĂNG.`,
      onOk: async () => {
        setLoading(true);
        const res = await freezeOverdueCustomersAction(ids);
        if (res.success) {
          message.success("Đã đóng băng hồ sơ quá hạn");
          loadData();
          setSelectedRowKeys([]);
        }
        setLoading(false);
      },
    });
  };

  const columns = [
    {
      title: "KHÁCH HÀNG",
      render: (r: any) => (
        <div>
          <Text strong>{r.fullName}</Text>
          <br />
          <Text type="secondary" className="text-[11px]">
            {r.phone}
          </Text>
        </div>
      ),
    },
    {
      title: "QUÁ HẠN",
      render: (r: any) => {
        const days = dayjs().diff(dayjs(r.createdAt), "day");
        return <Tag color="volcano">{days} ngày</Tag>;
      },
    },
    {
      title: "NHÂN VIÊN",
      render: (r: any) => r.assignedTo?.fullName || "Chưa giao",
    },
    {
      title: "HÀNH ĐỘNG",
      render: (r: any) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="primary"
              ghost
              icon={<SearchOutlined />}
              onClick={() => onViewDetail(r)} // Truyền lead ra trang cha
            />
          </Tooltip>
          <Tooltip title="Gửi mail">
            <Button
              icon={<MailOutlined />}
              onClick={() => handleSendMail([r.id])}
            />
          </Tooltip>
          <Tooltip title="Đóng băng">
            <Button
              danger
              icon={<ManOutlined />}
              onClick={() => handleFreeze([r.id])}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <AlertOutlined className="text-red-500" />
          <span className="uppercase font-bold">
            Khách hàng quá hạn (&gt; 60 ngày)
          </span>
        </Space>
      }
      open={open} // Đã sửa thành open
      onCancel={onClose}
      width={900}
      footer={null}
      centered
      className="premium-modal"
    >
      <div className="mb-4 flex justify-between items-center bg-red-50 p-4 rounded-2xl">
        <Text type="secondary">
          Xử lý hàng loạt ({selectedRowKeys.length}):
        </Text>
        <Space>
          <Button
            type="primary"
            icon={<MailOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => handleSendMail(selectedRowKeys as string[])}
          >
            Gửi Mail
          </Button>
          <Button
            danger
            icon={<ManOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => handleFreeze(selectedRowKeys as string[])}
          >
            Đóng Băng
          </Button>
        </Space>
      </div>

      <Table
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        columns={columns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 6 }}
      />
    </Modal>
  );
}
