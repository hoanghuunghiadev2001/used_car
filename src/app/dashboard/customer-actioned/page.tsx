/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Tabs,
  Input,
  Space,
  Card,
  Badge,
  Button,
  Typography,
  ConfigProvider,
  Empty,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import {
  CustomerWithRelations,
  getCustomerList,
  GetCustomersParams,
} from "@/actions/customer-actions";

const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function CustomerManager() {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [data, setData] = useState<CustomerWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // --- STATE QUẢN LÝ BỘ LỌC ---
  const [activeTab, setActiveTab] =
    useState<GetCustomersParams["tab"]>("frozen");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    province: undefined as string | undefined,
    carModelId: undefined as string | undefined,
    page: 1,
    pageSize: 10,
  });

  // --- LOGIC 1: DEBOUNCE SEARCH ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // --- LOGIC 2: FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCustomerList({
        tab: activeTab,
        search: filters.search,
        province: filters.province,
        carModelId: filters.carModelId,
        page: filters.page,
        pageSize: filters.pageSize,
      });

      if (res.success && res.data) {
        setData(res.data as any[]);
        setTotal(res.meta?.total || 0);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, filters]);

  // --- ĐỊNH NGHĨA CỘT BẢNG ---
  const columns = [
    {
      title: "Khách hàng",
      key: "customer",
      fixed: "left" as const,
      width: 220,
      render: (record: CustomerWithRelations) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: "14px", color: "#1677ff" }}>
            {record.fullName}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.phone}{" "}
            {record.licensePlate ? `• ${record.licensePlate}` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: string, record: any) => {
        let color = "blue";
        let icon = <CheckCircleOutlined />;
        // eslint-disable-next-line prefer-const
        let label = status;

        if (record.isLate) {
          color = "error";
          icon = <ClockCircleOutlined />;
        } else {
          switch (status) {
            case "FROZEN":
              color = "default";
              break;
            case "LOSE":
              color = "magenta";
              icon = <CloseCircleOutlined />;
              break;
            case "DEAL_DONE":
              color = "success";
              break;
            case "PENDING_VIEW":
            case "PENDING_DEAL_APPROVAL":
            case "PENDING_LOSE_APPROVAL":
              color = "orange";
              icon = <ExclamationCircleOutlined />;
              break;
          }
        }

        return (
          <Tag color={color} icon={icon} style={{ borderRadius: "10px" }}>
            {label} {record.isLate && "(TRỄ)"}
          </Tag>
        );
      },
    },
    {
      title: "Người phụ trách",
      key: "assignedTo",
      width: 160,
      render: (record: CustomerWithRelations) => (
        <Space>
          <Text style={{ fontSize: "13px" }}>
            {record.assignedTo?.fullName || "---"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Xe quan tâm",
      key: "carModel",
      width: 180,
      render: (record: CustomerWithRelations) => (
        <Text italic style={{ fontSize: "13px" }}>
          {record.carModel?.name || "---"}
        </Text>
      ),
    },
    {
      title: "Khu vực",
      dataIndex: "province",
      key: "province",
      width: 120,
    },
    {
      title: "Cập nhật cuối",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (date: any) =>
        date
          ? new Date(date).toLocaleString("vi-VN", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "---",
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right" as const,
      width: 90,
      render: () => (
        <Button type="link" size="small">
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <ConfigProvider componentSize="middle">
      <Card
        bordered={false}
        style={{ borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      >
        {/* THANH CÔNG CỤ TÌM KIẾM */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} justify="space-between" align="middle">
            <Col xs={24} lg={8}>
              <Title level={4} style={{ margin: 0 }}>
                Quản lý Khách hàng
              </Title>
            </Col>
            <Col xs={24} lg={16}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <Input
                  placeholder="Tên, SĐT, Biển số..."
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 240 }}
                  allowClear
                />

                <Tooltip title="Làm mới">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchData()}
                  />
                </Tooltip>
              </div>
            </Col>
          </Row>
        </div>

        {/* TABS TRẠNG THÁI (Khớp với API switch case) */}
        <Tabs
          activeKey={activeTab}
          onChange={(key: any) => {
            setActiveTab(key);
            setFilters((prev) => ({ ...prev, page: 1 }));
          }}
          style={{ marginBottom: 8 }}
        >
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined /> Đóng băng
                {activeTab === "frozen" && (
                  <Badge
                    count={total}
                    overflowCount={999}
                    style={{ marginLeft: 8, backgroundColor: "#faad14" }}
                  />
                )}
              </span>
            }
            key="frozen"
          />
          <TabPane
            tab={
              <span>
                <ExclamationCircleOutlined /> Chờ duyệt
                {activeTab === "pending-approval" && (
                  <Badge
                    count={total}
                    overflowCount={999}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </span>
            }
            key="pending-approval"
          />
          <TabPane
            tab={
              <span>
                <CheckCircleOutlined /> Hoàn thành
              </span>
            }
            key="done"
          />
          <TabPane
            tab={
              <span>
                <CloseCircleOutlined /> Khách Lost
              </span>
            }
            key="lost"
          />
        </Tabs>

        {/* BẢNG DỮ LIỆU */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          bordered
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} khách hàng`,
            onChange: (page, pageSize) => {
              setFilters((prev) => ({ ...prev, page, pageSize }));
            },
          }}
          scroll={{ x: 1100, y: "calc(100vh - 400px)" }}
          locale={{
            emptyText: <Empty description="Không có dữ liệu khách hàng" />,
          }}
        />
      </Card>
    </ConfigProvider>
  );
}
