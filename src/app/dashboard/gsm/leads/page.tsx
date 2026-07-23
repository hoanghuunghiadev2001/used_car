/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Card,
  Typography,
  Space,
  Avatar,
  Row,
  Col,
  Input,
  Select,
  Button,
  DatePicker,
  Badge,
  message,
} from "antd";
import {
  UserOutlined,
  CarOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import {
  getLeadsWithoutSensitiveAction,
  getLeadsWithoutSensitiveActionGSM,
} from "@/actions/customer-actions";
import { getBranchesAction } from "@/actions/branch-actions";
import dayjs from "@/lib/dayjs";
import { getLeadStatusHelper } from "@/lib/status-helper";
import { getExportCustomerData } from "@/actions/export-actions";
import { handleExportFullCustomerExcelManager } from "@/utils/excel-helper";
import LeadDetailModal from "@/components/LeadDetailCustomer";

const { Text, Title } = Typography;
const { Option } = Select;

export default function GSMLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<any[]>([]);

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState<any>(null);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "ALL",
    branchId: "ALL",
  });

  const loadBranches = async () => {
    try {
      const res = await getBranchesAction();
      setBranches(res || []);
    } catch (error) {
      console.error("Lỗi tải chi nhánh");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Lưu ý: getLeadsWithoutSensitiveAction phải tự động lọc theo
      // departmentId của GSM đang đăng nhập (xử lý ở server, dựa vào
      // getCurrentUser()) — KHÔNG truyền departmentId từ client xuống.
      const res = await getLeadsWithoutSensitiveActionGSM({
        ...filters,
        startDate: dateRange?.[0]?.toISOString(),
        endDate: dateRange?.[1]?.toISOString(),
      });
      setData(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error("Lỗi tải dữ liệu Leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);
  useEffect(() => {
    loadData();
  }, [filters, dateRange]);

  const onExportExcel = async () => {
    setExportLoading(true);
    try {
      const startDate = dateRange ? dateRange[0].toDate() : undefined;
      const endDate = dateRange ? dateRange[1].toDate() : undefined;
      // Tương tự loadData: getExportCustomerData cũng phải tự scope
      // theo phòng ban của GSM ở phía server.
      const exportData = await getExportCustomerData(
        startDate,
        endDate,
        filters.branchId,
      );

      if (!exportData?.length) return message.info("Không có dữ liệu để xuất");

      await handleExportFullCustomerExcelManager(exportData);
      message.success(`Xuất thành công ${exportData.length} hồ sơ!`);
    } catch (error: any) {
      message.error("Lỗi xuất file: " + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const getReferralTypeTag = (type: string) => {
    const config: any = {
      SELL: { color: "volcano", label: "THU MUA" },
      BUY: { color: "green", label: "BÁN XE" },
      VALUATION: { color: "gold", label: "ĐỊNH GIÁ" },
      SELL_TRADE_NEW: { color: "blue", label: "ĐỔI XE MỚI" },
      SELL_TRADE_USED: { color: "cyan", label: "ĐỔI XE LƯỚT" },
    };
    const item = config[type] || { color: "default", label: type };
    return (
      <Tag
        color={item.color}
        className="font-bold m-0 border-none px-2 rounded"
      >
        {item.label}
      </Tag>
    );
  };

  const columns = [
    {
      title: "KHÁCH HÀNG",
      fixed: "left" as any,
      width: 220,
      render: (r: any) => (
        <Space>
          <Avatar
            size="large"
            className="bg-gradient-to-tr from-indigo-600 to-purple-500"
            icon={<UserOutlined />}
          />
          <div className="flex flex-col">
            <Text strong className="text-slate-800">
              {r.fullName}
            </Text>
            <Text type="secondary" className="text-[11px]">
              <EnvironmentOutlined /> {r.province || "N/A"}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "CHI NHÁNH",
      responsive: ["md"] as any,
      width: 150,
      render: (r: any) => (
        <div className="flex flex-col">
          <Text className="text-[12px] font-semibold text-slate-600">
            {r.branch?.name || "N/A"}
          </Text>
          <Text type="secondary" className="text-[10px] italic">
            {dayjs(r.createdAt).format("DD/MM/YYYY")}
          </Text>
        </div>
      ),
    },

    {
      title: "NHU CẦU",
      width: 120,
      render: (r: any) => getReferralTypeTag(r.type),
    },
    {
      title: "MODEL XE",
      width: 180,
      render: (r: any) => (
        <Space direction="vertical" size={0}>
          <Text className="text-[13px] font-bold text-blue-700">
            <CarOutlined /> {r.carModel?.name || r.leadCar?.modelName || "N/A"}
          </Text>
          <Text type="secondary" className="text-[11px]">
            Năm: {r.leadCar?.year || "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      width: 150,
      render: (status: string) => {
        const { label, color } = getLeadStatusHelper(status);
        return (
          <Badge
            color={color}
            text={
              <Text
                className="font-bold text-[11px] uppercase"
                style={{ color }}
              >
                {label}
              </Text>
            }
          />
        );
      },
    },
    {
      // Nâng cấp: hiển thị rõ NV phụ trách + chức vụ, GSM cần thấy chi tiết hơn Sale thường
      title: "NV PHỤ TRÁCH",
      responsive: ["lg"] as any,
      width: 180,
      render: (r: any) =>
        r.assignedTo ? (
          <Space direction="vertical" size={0}>
            <Tag
              icon={<TeamOutlined />}
              color="processing"
              className="rounded-full border-none bg-blue-50 text-blue-700 font-medium"
            >
              {r.assignedTo.fullName}
            </Tag>
            <Text type="secondary" className="text-[10px] pl-1">
              {r.assignedTo?.position?.name || ""}
            </Text>
          </Space>
        ) : (
          <Text type="danger" className="text-[11px] italic">
            Chưa bàn giao
          </Text>
        ),
    },
    {
      title: "",
      key: "action",
      width: 60,
      fixed: "right" as any,
      render: () => (
        <Button
          type="text"
          icon={<InfoCircleOutlined className="text-blue-500" />}
        />
      ),
    },
  ];

  return (
    <div className="p-3 md:p-6 bg-[#f0f2f5] min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Card
          className="rounded-2xl border-none shadow-sm overflow-hidden"
          bodyStyle={{ padding: "16px 24px" }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} xl={6}>
              <Space direction="vertical" size={0}>
                <Title
                  level={4}
                  className="m-0! font-black text-slate-800 tracking-tight uppercase"
                >
                  Leads Phòng Ban (GSM)
                </Title>
                <Text type="secondary" className="text-[12px]">
                  Hiển thị{" "}
                  <Text strong className="text-blue-600">
                    {data.length}
                  </Text>{" "}
                  trên tổng số <Text strong>{total}</Text> hồ sơ trong phòng ban
                </Text>
              </Space>
            </Col>

            <Col xs={24} xl={18}>
              <div className="flex flex-wrap gap-2 justify-end">
                <DatePicker.RangePicker
                  className="rounded-lg h-10 w-full sm:w-auto"
                  onChange={(val) => setDateRange(val)}
                />

                <Select
                  className="w-full sm:w-40 h-10"
                  placeholder="Chi nhánh"
                  onChange={(val) =>
                    setFilters({ ...filters, branchId: val, page: 1 })
                  }
                  defaultValue="ALL"
                >
                  <Option value="ALL">Tất cả chi nhánh</Option>
                  {branches.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {b.name}
                    </Option>
                  ))}
                </Select>

                <Select
                  className="w-full sm:w-40 h-10"
                  defaultValue="ALL"
                  onChange={(val) =>
                    setFilters({ ...filters, status: val, page: 1 })
                  }
                >
                  <Option value="ALL">Tất cả trạng thái</Option>
                  <Option value="NEW">Mới tiếp nhận</Option>
                  <Option value="FOLLOW_UP">Đang chăm sóc</Option>
                  <Option value="DEAL_DONE">Đã chốt</Option>
                </Select>

                <Input
                  className="w-full sm:w-48 h-10 rounded-lg"
                  placeholder="Tên khách hàng..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  allowClear
                  onPressEnter={(e: any) =>
                    setFilters({ ...filters, search: e.target.value, page: 1 })
                  }
                />

                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  loading={exportLoading}
                  className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 border-none font-bold"
                  onClick={onExportExcel}
                >
                  XUẤT BÁO CÁO
                </Button>

                <Button
                  icon={<ReloadOutlined />}
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  onClick={loadData}
                />
              </div>
            </Col>
          </Row>
        </Card>

        <Card
          className="rounded-2xl border-none shadow-sm"
          bodyStyle={{ padding: 0 }}
        >
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            className="custom-table"
            onRow={(record) => ({
              onClick: () => {
                setSelectedLead(record);
                setIsModalOpen(true);
              },
              className: "cursor-pointer hover:bg-blue-50/50 transition-all",
            })}
            pagination={{
              total,
              current: filters.page,
              pageSize: filters.limit,
              showSizeChanger: true,
              className: "px-6 py-4",
              onChange: (page, pageSize) =>
                setFilters({ ...filters, page, limit: pageSize }),
            }}
          />
        </Card>
      </div>

      <LeadDetailModal
        open={isModalOpen}
        lead={selectedLead}
        onCancel={() => setIsModalOpen(false)}
        getReferralTypeTag={getReferralTypeTag}
      />

      <style jsx global>{`
        .custom-table .ant-table-thead > tr > th {
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .ant-table-row {
          transition: all 0.2s;
        }
      `}</style>
    </div>
  );
}
