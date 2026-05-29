/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Card,
  Tag,
  Typography,
  Space,
  Empty,
  Spin,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useDebounce } from "@/hooks/use-debounce";
import { getCustomersAction } from "@/actions/customer-actions";

const { Title, Text } = Typography;
// Định nghĩa kiểu dữ liệu cho khách hàng
interface CustomerLead {
  id: string;
  fullName: string;
  phone: string;
  createdAt: string;
  carModel?: { name: string };
  assignedTo?: { fullName: string };
  branch?: { name: string };
}

const MarketingDashboard = () => {
  // State quản lý dữ liệu
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  // Áp dụng Debounce cho ô tìm kiếm (500ms)
  const debouncedSearch = useDebounce(searchText, 500);

  const [data, setData] = useState<CustomerLead[]>([]);

  const getLabelByType = (type: string) => {
    const mapping: Record<string, string> = {
      SELL: "Bán xe",
      BUY: "Mua xe",
      SELL_TRADE_NEW: "Đổi xe mới",
      SELL_TRADE_USED: "Đổi xe cũ",
      VALUATION: "Định giá",
    };
    return mapping[type] || type;
  };

  const getColorByType = (type: string) => {
    const colors: Record<string, string> = {
      SELL: "green",
      BUY: "blue",
      SELL_TRADE_NEW: "purple",
      SELL_TRADE_USED: "orange",
    };
    return colors[type] || "default";
  };

  const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
    // Nhóm Social
    FACEBOOK_ADS: { label: "Facebook Ads", color: "#1877f2" },
    FACEBOOK_PERSONAL: { label: "FB Cá nhân", color: "#4267B2" },
    TIKTOK_COMPANY: { label: "TikTok (Cty)", color: "#000000" },
    TIKTOK_PERSONAL: { label: "TikTok (Cá nhân)", color: "#FE2C55" },
    YOUTUBE_COMPANY: { label: "YouTube (Cty)", color: "#FF0000" },
    YOUTUBE_PERSONAL: { label: "YouTube (Cá nhân)", color: "#c4302b" },

    // Nhóm Zalo & Chat
    ZALO_OA: { label: "Zalo OA", color: "#0068FF" },
    ZALO_PERSONAL: { label: "Zalo Cá nhân", color: "#0091FF" },

    // Nhóm khác
    GOOGLE_MAPS: { label: "Google Maps", color: "#4285F4" },
    CHOTOT: { label: "Chợ Tốt", color: "#f59e0b" },
    REFERRAL: { label: "Người giới thiệu", color: "#10b981" },
    WALK_IN: { label: "Khách vãng lai", color: "#8b5cf6" },
    HOTLINE: { label: "Hotline", color: "#ef4444" },
    // ... bổ sung các nguồn còn lại
  };

  // Trong hàm fetchData, kiểu dữ liệu sẽ tự động khớp
  const fetchData = async (page: number, search: string) => {
    setLoading(true);
    try {
      const result = await getCustomersAction({
        page,
        pageSize: 10,
        searchText: search,
      });

      // Bây giờ result.data được TypeScript hiểu là CustomerLead[]
      setData(result.data as CustomerLead[]);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const columns = [
    {
      title: "Khách hàng",
      dataIndex: "fullName",
      key: "fullName",
      render: (text: string) => (
        <Text strong className="text-gray-800">
          {text}
        </Text>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string) => (
        <Text className="font-mono text-blue-600">{phone}</Text>
      ),
    },
    {
      title: "Nguồn",
      dataIndex: "source",
      key: "source",
      render: (source: string) => {
        const config = SOURCE_CONFIG[source] || {
          label: source,
          color: "#666",
        };
        return (
          <Tooltip title={config.label}>
            <Tag
              color={config.color}
              className="cursor-pointer border-none rounded-md px-2"
            >
              {config.label.length > 12
                ? config.label.substring(0, 10) + "..."
                : config.label}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Người giới thiệu",
      dataIndex: "referrer",
      key: "referrer",
      render: (referrer: any) =>
        referrer?.fullName || <Text type="secondary">N/A</Text>,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branch",
      key: "branch",
      render: (branch: any) => <Tag color="cyan">{branch?.name || "---"}</Tag>,
    },
    {
      title: "Ngày nhập",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <Text className="text-gray-500 text-xs">
          {new Date(date).toLocaleDateString("vi-VN")}{" "}
          {new Date(date).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      ),
    },
    {
      title: "Nhu cầu",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={getColorByType(type)} className="uppercase font-medium">
          {getLabelByType(type)}
        </Tag>
      ),
    },
    {
      title: "Sale phụ trách",
      dataIndex: "assignedTo",
      key: "assignedTo",
      render: (sale: any) =>
        sale ? (
          <Space>
            <UserOutlined className="text-gray-400" /> {sale.fullName}
          </Space>
        ) : (
          <Tag color="default">Chưa phân bổ</Tag>
        ),
    },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <Title level={2} className="!m-0">
              Danh sách Leads
            </Title>
            <Text type="secondary">
              Quản lý và theo dõi nguồn khách hàng tập trung
            </Text>
          </div>
          <div className="flex gap-3">
            {/* Có thể thêm button tạo mới hoặc filter nâng cao ở đây */}
          </div>
        </div>

        {/* Toolbar Section */}
        <Card className="mb-6 shadow-sm border-0 rounded-xl">
          <div className="flex items-center gap-4">
            <Input
              size="large"
              placeholder="Tìm kiếm theo tên, SĐT hoặc biển số..."
              prefix={<SearchOutlined className="text-gray-400" />}
              className="max-w-md rounded-lg"
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1); // Reset trang khi tìm kiếm
              }}
            />
            <Tag
              icon={<FilterOutlined />}
              color="processing"
              className="h-[40px] flex items-center px-4 rounded-lg"
            >
              Bộ lọc nâng cao
            </Tag>
          </div>
        </Card>

        {/* Table Section */}
        <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
          <Table
            columns={columns}
            dataSource={data}
            loading={{ spinning: loading, indicator: <Spin size="large" /> }}
            pagination={{
              current: currentPage,
              total: total,
              pageSize: 10,
              onChange: (page) => setCurrentPage(page),
              showSizeChanger: false,
            }}
            rowKey="id"
            locale={{
              emptyText: <Empty description="Không tìm thấy khách hàng nào" />,
            }}
            className="marketing-table"
          />
        </Card>
      </div>
    </div>
  );
};

export default MarketingDashboard;
