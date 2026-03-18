/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table,
  Tag,
  Card,
  Typography,
  Space,
  Row,
  Col,
  Input,
  Empty,
  Button,
  Avatar,
  Badge,
  App,
  Tooltip,
  Divider,
  Drawer,
  Segmented,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  PhoneOutlined,
  CarOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  MessageOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { getMyReferralHistory } from "@/actions/referral-actions";
import { getLeadStatusHelper } from "@/lib/status-helper";
import dayjs from "dayjs";
import { useDebounce } from "@/hooks/use-debounce";
import "dayjs/locale/vi";
import { ReferralType } from "@prisma/client";

const { Title, Text, Paragraph } = Typography;

// --- INTERFACES ---
interface ReferralLead {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  type: "BUY" | "SELL" | string;
  province?: string;
  carModel?: { name: string };
  leadCar?: { modelName: string };
  budget?: number;
  note?: string;
  assignedTo?: { fullName: string; phone: string };
  careHistory?: any[];
  nextContactAt?: string;
  nextContactNote?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyReferralPage() {
  const { message } = App.useApp();

  // --- STATES ---
  const [data, setData] = useState<ReferralLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReferralType>();

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ReferralLead | null>(null);

  const debouncedSearch = useDebounce(searchText, 800);

  // Fetch dữ liệu
  const fetchData = useCallback(
    async (page: number, search: string, status: ReferralType | undefined) => {
      setLoading(true);
      try {
        // Giả sử API hỗ trợ thêm param status
        const res = await getMyReferralHistory({
          page,
          pageSize: 10,
          search,
          type: status,
        });
        if (res.success) {
          setData(res.data);
          setTotal(res.total || 0);
        }
      } catch (error) {
        message.error("Không thể kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    fetchData(currentPage, debouncedSearch, statusFilter);
  }, [currentPage, debouncedSearch, statusFilter, fetchData]);

  // Reset trang khi đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleOpenDetail = (record: ReferralLead) => {
    setSelectedLead(record);
    setDetailVisible(true);
  };

  // --- RENDER HELPERS ---
  const StatusTag = ({ status }: { status: string }) => {
    const { icon, color, label } = getLeadStatusHelper(status);
    return (
      <Tag
        icon={icon}
        color={color}
        className="rounded-full px-3 flex gap-1 py-0.5 font-bold uppercase text-[10px] border-none shadow-sm"
      >
        {label}
      </Tag>
    );
  };

  const columns = [
    {
      title: "KHÁCH HÀNG",
      key: "customer",
      render: (r: ReferralLead) => (
        <Space
          size={12}
          className="cursor-pointer group"
          onClick={() => handleOpenDetail(r)}
        >
          <Avatar
            size={44}
            className="bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 group-hover:scale-105 transition-transform"
          >
            {r.fullName.charAt(0).toUpperCase()}
          </Avatar>
          <div className="flex flex-col">
            <Text
              strong
              className="text-slate-800 text-[14px] group-hover:text-indigo-600 transition-colors"
            >
              {r.fullName}
            </Text>
            <Text className="text-[12px] text-slate-400 font-mono">
              <PhoneOutlined className="mr-1 rotate-90" /> {r.phone}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "NHU CẦU & XE",
      key: "car",
      render: (r: ReferralLead) => {
        const isSell = ["SELL", "SELL_TRADE_NEW", "SELL_TRADE_USED"].includes(
          r.type,
        );
        return (
          <div
            className="flex flex-col gap-1 cursor-pointer"
            onClick={() => handleOpenDetail(r)}
          >
            <Space size={4}>
              <Tag
                color={isSell ? "volcano" : "cyan"}
                className="m-0 rounded text-[10px] font-bold border-none"
              >
                {isSell ? "BÁN XE" : "MUA XE"}
              </Tag>
              {r.province && (
                <Tag
                  icon={<EnvironmentOutlined />}
                  className="bg-slate-50 text-slate-500 border-none text-[10px]"
                >
                  {r.province}
                </Tag>
              )}
            </Space>
            <Text
              strong
              className="text-xs text-slate-600 truncate max-w-[180px]"
            >
              {r.carModel?.name || r.leadCar?.modelName || "Nhu cầu chung"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "TIẾN ĐỘ",
      dataIndex: "status",
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: "NHÂN VIÊN",
      dataIndex: "assignedTo",
      render: (staff: any) =>
        staff ? (
          <div className="flex items-center gap-2">
            <Avatar size="small" icon={<UserOutlined />} />
            <Text strong className="text-slate-700 text-xs">
              {staff.fullName}
            </Text>
          </div>
        ) : (
          <Text italic className="text-slate-300 text-xs">
            Chờ tiếp nhận
          </Text>
        ),
    },
    {
      title: "CẬP NHẬT",
      dataIndex: "updatedAt",
      align: "right" as any,
      render: (date: any) => (
        <div className="flex flex-col items-end">
          <Text className="text-[12px] text-slate-500 font-medium">
            {dayjs(date).format("DD/MM/YYYY")}
          </Text>
          <Text className="text-[10px] text-slate-300">
            {dayjs(date).format("HH:mm")}
          </Text>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* 1. HEADER & FILTERS */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-200 shadow-lg">
                <HistoryOutlined className="text-white text-xl" />
              </div>
              <div>
                <Title level={4} className="!m-0 text-slate-800">
                  Lịch sử giới thiệu
                </Title>
                <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  Theo dõi tiến độ hồ sơ
                </Text>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Input
                placeholder="Tìm tên, SĐT..."
                prefix={<SearchOutlined className="text-slate-300" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-10 rounded-xl border-slate-200 flex-1 md:w-64"
                allowClear
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  fetchData(currentPage, debouncedSearch, statusFilter)
                }
                loading={loading}
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* BỘ LỌC TRẠNG THÁI (MỚI THÊM) */}
          <div className="mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <Segmented
              block
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              className="p-1 bg-slate-100 rounded-xl min-w-[max-content]"
              options={[
                {
                  label: "Tất cả",
                  value: undefined,
                },
                {
                  label: "Mua xe",
                  value: "BUY",
                },
                {
                  label: "Bán xe",
                  value: "SELL",
                },
                {
                  label: "Đổi xe mới",
                  value: "SELL_TRADE_NEW",
                },
                {
                  label: "Đổi xe cũ",
                  value: "SELL_TRADE_USED",
                },
                {
                  label: "Định giá",
                  value: "VALUATION",
                },
              ]}
            />
          </div>

          {/* Thêm CSS này vào phần style jsx global của bạn để ẩn thanh cuộn xấu xí trên mobile */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* 2. DESKTOP TABLE */}
        <div className="hidden md:block">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              pagination={{
                current: currentPage,
                pageSize: 10,
                total: total,
                onChange: (p) => setCurrentPage(p),
                showSizeChanger: false,
                position: ["bottomCenter"],
              }}
              className="custom-referral-table"
            />
          </Card>
        </div>

        {/* 3. MOBILE CARDS */}
        <div className="md:hidden space-y-4">
          {loading ? (
            Array(3)
              .fill(0)
              .map((_, i) => <Card key={i} loading className="rounded-2xl" />)
          ) : data.length > 0 ? (
            data.map((r) => (
              <Card
                key={r.id}
                onClick={() => handleOpenDetail(r)}
                className="rounded-2xl border-none shadow-sm active:scale-[0.98] transition-all"
                bodyStyle={{ padding: "16px" }}
              >
                <div className="flex justify-between items-start mb-4">
                  <Space size={12}>
                    <Avatar className="bg-indigo-600 font-bold">
                      {r.fullName.charAt(0)}
                    </Avatar>
                    <div className="flex flex-col">
                      <Text strong className="text-[15px]">
                        {r.fullName}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {r.phone}
                      </Text>
                    </div>
                  </Space>
                  <StatusTag status={r.status} />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                  <CarOutlined className="text-indigo-500 text-lg" />
                  <div className="flex flex-col">
                    <Text className="text-[10px] text-slate-400 uppercase font-black">
                      Xe quan tâm
                    </Text>
                    <Text strong className="text-xs">
                      {r.carModel?.name ||
                        r.leadCar?.modelName ||
                        "Nhu cầu chung"}
                    </Text>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-dashed border-slate-200">
                  <Text className="text-[11px] text-slate-400 italic">
                    {dayjs(r.createdAt).format("DD/MM/YYYY HH:mm")}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    className="text-indigo-600 font-bold text-[11px] p-0"
                  >
                    CHI TIẾT <ArrowRightOutlined />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Empty
              description="Không tìm thấy hồ sơ nào"
              className="bg-white p-10 rounded-2xl"
            />
          )}
        </div>
      </div>

      {/* 4. DETAIL DRAWER (Đã tối ưu) */}
      <Drawer
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={window?.innerWidth > 768 ? 500 : "100%"}
        placement="right"
        closeIcon={null}
        headerStyle={{ display: "none" }}
        bodyStyle={{ padding: 0 }}
      >
        {selectedLead && (
          <div className="flex flex-col h-full bg-[#fcfcfd]">
            <div className="bg-indigo-600 p-8 text-white relative text-center">
              <Button
                icon={<ArrowRightOutlined rotate={180} />}
                className="absolute top-4 left-4 bg-white/20 border-none text-white"
                onClick={() => setDetailVisible(false)}
                shape="circle"
              />
              <Avatar
                size={80}
                className="bg-white text-indigo-600 font-bold mb-3 shadow-xl"
              >
                {selectedLead.fullName.charAt(0)}
              </Avatar>
              <Title level={4} className="!m-0 !text-white">
                {selectedLead.fullName}
              </Title>
              <Text className="text-indigo-100 font-mono">
                {selectedLead.phone}
              </Text>
              <div className="mt-4">
                <StatusTag status={selectedLead.status} />
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Thông tin nhu cầu */}
              <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <InfoCircleOutlined className="text-indigo-500" />
                  <Text className="font-bold uppercase text-xs tracking-wider">
                    Thông tin hồ sơ
                  </Text>
                </div>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text className="text-[10px] text-slate-400 block uppercase">
                      Loại hình
                    </Text>
                    <Text strong>
                      {selectedLead.type === "BUY" ? "Mua xe" : "Bán xe"}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text className="text-[10px] text-slate-400 block uppercase">
                      Ngân sách
                    </Text>
                    <Text strong className="text-orange-600">
                      {selectedLead.budget
                        ? `${selectedLead.budget.toLocaleString()}đ`
                        : "Thỏa thuận"}
                    </Text>
                  </Col>
                  <Col span={24}>
                    <Text className="text-[10px] text-slate-400 block uppercase">
                      Ghi chú
                    </Text>
                    <Text className="text-xs text-slate-600">
                      {selectedLead.note || "N/A"}
                    </Text>
                  </Col>
                </Row>
              </section>

              {/* Nhật ký chăm sóc */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <HistoryOutlined className="text-indigo-500" />
                  <Text className="font-bold uppercase text-xs tracking-wider">
                    Lịch sử chăm sóc
                  </Text>
                </div>
                {selectedLead.careHistory?.length ? (
                  <div className="ml-2 pl-6 border-l-2 border-dashed border-slate-200 space-y-6">
                    {selectedLead.careHistory.map((h, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-indigo-500" />
                        <Text className="text-[11px] text-slate-400 font-bold">
                          {dayjs(h.createdAt).format("DD/MM/YYYY HH:mm")}
                        </Text>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 mt-1 shadow-sm">
                          <Paragraph className="text-slate-600 text-xs !mb-0">
                            {h.result}
                          </Paragraph>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có nhật ký"
                  />
                )}
              </section>

              {/* Chuyên viên hỗ trợ */}
              {selectedLead.assignedTo && (
                <section className="bg-slate-900 rounded-2xl p-4 text-white">
                  <Text className="text-[10px] text-slate-400 uppercase font-black block mb-3">
                    Chuyên viên phụ trách
                  </Text>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="bg-indigo-500">
                        {selectedLead.assignedTo.fullName.charAt(0)}
                      </Avatar>
                      <div>
                        <Text className="text-white font-bold block">
                          {selectedLead.assignedTo.fullName}
                        </Text>
                        <Text className="text-slate-400 text-xs">
                          {selectedLead.assignedTo.phone}
                        </Text>
                      </div>
                    </div>
                    <Space>
                      <Button
                        shape="circle"
                        icon={<PhoneOutlined />}
                        href={`tel:${selectedLead.assignedTo.phone}`}
                      />
                      <Button
                        shape="circle"
                        className="bg-blue-600 border-none text-white"
                        icon={<MessageOutlined />}
                        href={`https://zalo.me/${selectedLead.assignedTo.phone}`}
                        target="_blank"
                      />
                    </Space>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <style jsx global>{`
        .custom-referral-table .ant-table {
          background: transparent !important;
        }
        .custom-referral-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          font-weight: 800 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .ant-segmented-item-selected {
          background: #fff !important;
          color: #4f46e5 !important;
          font-weight: bold;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* Giúp Segmented không bị co rúm trên màn hình nhỏ */
        .ant-segmented-item {
          min-width: 80px;
        }
      `}</style>
    </div>
  );
}
