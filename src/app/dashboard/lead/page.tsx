/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Descriptions,
  Card,
  Typography,
  Space,
  Badge,
  Avatar,
  Input,
  Select,
  Button,
  Modal,
  Tabs,
  Timeline,
  message,
  DatePicker,
  Spin,
  Empty,
  Popconfirm,
} from "antd";
import {
  UserOutlined,
  CarOutlined,
  SearchOutlined,
  ReloadOutlined,
  PhoneOutlined,
  AlertOutlined,
  FileExcelOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  RightOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  deleteCustomerAction,
  getLeadsAction,
  getOverdueCustomersAction,
} from "@/actions/customer-actions";
import { getBranchesAction } from "@/actions/branch-actions";
import dayjs from "@/lib/dayjs";
import { getLeadStatusHelper } from "@/lib/status-helper";
import { getExportCustomerData } from "@/actions/export-actions";
import {
  handleExportFullCustomerExcel,
  translateSource,
} from "@/utils/excel-helper";
import LeadDetailModal from "@/components/LeadDetailCustomer";
import { UrgencyBadge } from "@/lib/urgencyBadge";

const { Text, Title } = Typography;
const { Option, OptGroup } = Select;

export default function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<any[]>([]);

  // States UI
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overdueData, setOverdueData] = useState<any[]>([]);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState<any>(null);
  const [tempSearch, setTempSearch] = useState(""); // Lưu giá trị đang gõ

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      search: tempSearch,
      page: 1, // Luôn reset về trang 1 khi tìm kiếm mới
    }));
  };

  // Hàm xử lý khi nhấn phím Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "ALL",
    type: "ALL", // <--- Thêm mới field này
    branch: "ALL", // Gửi lên Server Action là 'branch' hoặc 'branchId' tùy bạn đặt ở Action
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  const handleDateChange = (dates: any) => {
    setDateRange(dates);
    if (dates) {
      setFilters({
        ...filters,
        page: 1,
        // Dùng format để giữ đúng ngày bạn nhìn thấy trên màn hình
        startDate: dates[0].format("YYYY-MM-DD"),
        endDate: dates[1].format("YYYY-MM-DD"),
      });
    } else {
      setFilters({
        ...filters,
        page: 1,
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  // 1. Fetch Danh sách chi nhánh
  const fetchBranches = async () => {
    try {
      const res = await getBranchesAction();
      // Kiểm tra res có phải mảng trực tiếp không, hoặc res.data
      const branchData = Array.isArray(res) ? res : (res as any)?.data || [];
      setBranches([{ id: "ALL", name: "Tất cả chi nhánh" }, ...branchData]);
    } catch (error) {
      console.error("Lỗi lấy chi nhánh:", error);
    }
  };

  // 2. Fetch Dữ liệu chính
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Lưu ý: Key truyền vào đây phải khớp với key bạn bóc tách ở getLeadsAction (search, status, branch)
      const [res, overdueRes] = await Promise.all([
        getLeadsAction(filters),
        getOverdueCustomersAction(),
      ]);
      setData(res.data || []);
      setTotal(res.total || 0);
      setOverdueData(overdueRes || []);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onExportExcel = async () => {
    setExportLoading(true);
    try {
      // Chuyển đổi string từ filters sang đối tượng Date hoặc undefined
      const sDate = filters.startDate
        ? dayjs(filters.startDate).startOf("day").toDate()
        : undefined;
      const eDate = filters.endDate
        ? dayjs(filters.endDate).endOf("day").toDate()
        : undefined;

      // Truyền sDate, eDate (kiểu Date) vào hàm
      const exportData = await getExportCustomerData(
        sDate,
        eDate,
        filters.branch,
      );

      if (!exportData || exportData.length === 0) {
        return message.info("Không có dữ liệu");
      }

      await handleExportFullCustomerExcel(exportData);
      message.success(`Xuất thành công!`);
    } catch (error: any) {
      console.error("Lỗi chi tiết:", error);
      message.error("Lỗi xuất file");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteCustomerAction(id);
      if (res.success) {
        message.success("Xóa khách hàng thành công");
        loadData(); // Tải lại danh sách
        setIsModalOpen(false); // Đóng modal nếu đang mở
      } else {
        message.error(res.error);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi xóa");
    }
  };

  const getReferralTypeTag = (type: string) => {
    const config: any = {
      SELL: { color: "volcano", label: "THU MUA" },
      BUY: { color: "green", label: "BÁN XE" },
      VALUATION: { color: "gold", label: "ĐỊNH GIÁ" },
      SELL_TRADE_NEW: { color: "blue", label: "ĐỔI XE MỚI" },
      SELL_TRADE_USED: { color: "purple", label: "ĐỔI XE CŨ" },
    };
    const item = config[type] || { color: "default", label: type };
    return (
      <Tag color={item.color} className="rounded-md font-bold text-[10px] m-0">
        {item.label}
      </Tag>
    );
  };

  // --- RENDERING MOBILE ---
  const renderMobileList = () => {
    if (loading && data.length === 0)
      return (
        <div className="p-10 text-center">
          <Spin />
        </div>
      );
    if (data.length === 0)
      return <Empty description="Không tìm thấy khách hàng" />;

    return (
      <div className="space-y-3 pb-20">
        {data.map((r) => {
          const { label, color, icon } = getLeadStatusHelper(r.status);
          return (
            <div
              key={r.id}
              onClick={() => {
                setSelectedLead(r);
                setIsModalOpen(true);
              }}
              className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 active:bg-slate-50 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <Space size={12}>
                  <Avatar
                    size={44}
                    className="bg-indigo-600 shadow-lg"
                    icon={<UserOutlined />}
                  />
                  <div>
                    <div className="font-bold text-slate-800 text-base">
                      {r.fullName}
                    </div>
                    <div className="text-blue-600 font-bold text-sm font-mono">
                      {r.phone}
                    </div>
                  </div>
                </Space>
                <Tag
                  color={color}
                  icon={icon}
                  className="m-0 rounded-full border-none font-bold text-[10px] px-2 uppercase"
                >
                  {label}
                </Tag>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Dòng xe
                  </div>
                  <div className="text-xs font-medium truncate italic">
                    <CarOutlined /> {r.carModel?.name || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Nhu cầu
                  </div>
                  <div>{getReferralTypeTag(r.type)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-slate-200">
                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <EnvironmentOutlined /> {r.branch?.name || "Hệ thống"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {dayjs(r.createdAt).format("DD/MM/YYYY")}{" "}
                  <RightOutlined className="ml-1 text-[8px]" />
                </div>
              </div>
            </div>
          );
        })}
        {total > data.length && (
          <Button
            block
            className="h-12 rounded-2xl border-dashed border-indigo-200 text-indigo-500 font-bold"
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Xem thêm khách hàng ({total - data.length})
          </Button>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: "KHÁCH HÀNG",
      width: 250,
      fixed: "left" as any,
      render: (r: any) => (
        <Space size={12}>
          <Avatar
            size={40}
            className="bg-indigo-600 shadow-sm"
            icon={<UserOutlined />}
          />
          <div className="flex flex-col">
            <div className="flex gap-2 items-center">
              <Text strong className="text-slate-800 text-[14px] leading-tight">
                {r.fullName}
              </Text>
              <UrgencyBadge type={r.urgencyLevel} />
            </div>
            <Text className="text-[13px] text-blue-600 font-bold font-mono">
              <PhoneOutlined className="mr-1" /> {r.phone}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "CHI NHÁNH",
      width: 180,
      render: (r: any) => (
        <Space className="text-slate-600">
          <EnvironmentOutlined className="text-red-400" />
          <Text className="text-[12px] font-medium">
            {r.branch?.name || "Hệ thống"}
          </Text>
        </Space>
      ),
    },
    {
      title: "MODEL & BIỂN SỐ",
      width: 200,
      render: (r: any) => (
        <div className="flex flex-col">
          <Text className="text-[13px] font-bold text-slate-700">
            <CarOutlined className="mr-1 text-slate-400" />{" "}
            {r.carModel?.name || "N/A"}
          </Text>
          {r.licensePlate && (
            <Tag
              color="blue"
              className="w-fit text-[11px] font-mono mt-1 font-bold"
            >
              {r.licensePlate}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "NHU CẦU",
      width: 120,
      render: (r: any) => getReferralTypeTag(r.type),
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      width: 150,
      render: (status: string) => {
        const { label, color, icon } = getLeadStatusHelper(status);
        return (
          <Tag
            icon={icon}
            color={color}
            className="font-bold uppercase text-[10px] px-3 rounded-full border-none"
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "NGÀY TẠO",
      dataIndex: "createdAt",
      width: 110,
      align: "right" as any,
      render: (date: any) => (
        <Text className="text-[12px] text-slate-500 font-mono">
          {dayjs(date).format("DD/MM/YYYY")}
        </Text>
      ),
    },
    {
      title: "THAO TÁC",
      key: "action",
      width: 80,
      fixed: "right" as any,
      render: (r: any) => (
        <Popconfirm
          title="Xóa khách hàng?"
          description="Dữ liệu task và lịch sử sẽ bị xóa vĩnh viễn."
          onConfirm={(e) => {
            e?.stopPropagation(); // Ngăn sự kiện onClick của dòng
            handleDelete(r.id);
          }}
          onCancel={(e) => e?.stopPropagation()}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()} // Ngăn mở Modal khi bấm nút xóa
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="p-3 md:p-6 lg:p-10 bg-[#f8fafc] min-h-screen">
      <div className="max-w-400 mx-auto space-y-4">
        {/* HEADER */}
        <div className="bg-white p-5 rounded-4xl shadow-sm border border-slate-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <Title
                level={3}
                className="m-0! font-black text-slate-800 tracking-tight"
              >
                QUẢN LÝ LEADS
                <Badge
                  count={total}
                  className="ml-3"
                  style={{ backgroundColor: "#4f46e5" }}
                />
              </Title>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Dữ liệu tập trung
              </Text>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <Button
                icon={<FileExcelOutlined />}
                loading={exportLoading}
                className="flex-1 lg:flex-none h-10 rounded-xl font-bold bg-emerald-600 text-white border-none"
                onClick={onExportExcel}
              >
                XUẤT EXCEL
              </Button>
              <Badge count={overdueData.length}>
                <Button
                  danger
                  type="primary"
                  icon={<AlertOutlined />}
                  className="w-full lg:w-auto h-10 rounded-xl font-bold"
                  onClick={() => setIsOverdueModalOpen(true)}
                >
                  QUÁ HẠN
                </Button>
              </Badge>
              <Button
                icon={<ReloadOutlined />}
                className="h-10 w-10 rounded-xl border-slate-200"
                onClick={loadData}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
            <Input
              placeholder="Tìm tên, SĐT, biển số..."
              prefix={<SearchOutlined className="text-slate-400" />}
              className="h-11 rounded-2xl bg-white border border-slate-200 shadow-sm"
              allowClear
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)} // Chỉ cập nhật state tạm
              onKeyDown={handleKeyDown} // Bấm Enter để tìm
              suffix={
                <Button
                  type="primary"
                  size="small"
                  icon={<SearchOutlined />}
                  onClick={handleSearch} // Click nút để tìm
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center"
                >
                  Tìm
                </Button>
              }
            />
            <Select
              className="w-full h-11 custom-select"
              placeholder="Chọn chi nhánh"
              value={filters.branch}
              onChange={(val) =>
                setFilters({ ...filters, branch: val, page: 1 })
              }
            >
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.name}
                </Option>
              ))}
            </Select>

            <Select
              className="w-full h-11 custom-select"
              placeholder="Nhu cầu khách"
              value={filters.type}
              onChange={(val) => setFilters({ ...filters, type: val, page: 1 })}
            >
              <Option value="ALL">Tất cả nhu cầu</Option>
              <Option value="SELL">Thu mua (Khách bán)</Option>
              <Option value="BUY">Bán xe (Khách mua)</Option>
              <Option value="TRADE">Trao đổi xe</Option>
            </Select>
            <Select
              className="w-full h-11 custom-select"
              value={filters.status}
              onChange={(val) =>
                setFilters({ ...filters, status: val, page: 1 })
              }
            >
              <Option value="ALL">Tất cả trạng thái</Option>

              {/* Nhóm Đang xử lý */}
              <OptGroup label="Tiến độ xử lý">
                <Option value="NEW">Mới (Chưa nhận)</Option>
                <Option value="PENDING_VIEW">Chờ xem/Tiếp nhận</Option>
                <Option value="FOLLOW_UP">Đang chăm sóc</Option>
                <Option value="CONTACTED">Đã liên hệ</Option>
                <Option value="INSPECTING">Đang xem xe/Lái thử</Option>
              </OptGroup>

              {/* Nhóm Phê duyệt */}
              <OptGroup label="Đang phê duyệt">
                <Option value="PENDING_DEAL_APPROVAL">Chờ duyệt chốt</Option>
                <Option value="PENDING_LOSE_APPROVAL">
                  Chờ duyệt đóng hồ sơ
                </Option>
                <Option value="REJECTED_APPROVAL">Bị từ chối phê duyệt</Option>
              </OptGroup>

              {/* Nhóm Kết quả */}
              <OptGroup label="Kết thúc">
                <Option value="DEAL_DONE">Thành công (Đã chốt)</Option>
                <Option value="LOSE">Thất bại (Lose)</Option>
                <Option value="CANCELLED">Đã hủy</Option>
                <Option value="FROZEN">Tạm dừng (Đóng băng)</Option>
              </OptGroup>
            </Select>
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              className="h-11 rounded-2xl bg-slate-50 border-none w-full"
              onChange={handleDateChange} // Sử dụng hàm handle mới
            />
          </div>
        </div>

        {/* TABLE (DESKTOP) */}
        <div className="hidden md:block">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              onRow={(record) => ({
                onClick: () => {
                  setSelectedLead(record);
                  setIsModalOpen(true);
                },
              })}
              pagination={{
                total,
                current: filters.page,
                pageSize: filters.limit,
                onChange: (page, limit) =>
                  setFilters({ ...filters, page, limit }),
                className: "px-6",
              }}
              scroll={{ x: 1200 }}
              className="premium-table"
            />
          </Card>
        </div>

        {/* LIST (MOBILE) */}
        <div className="md:hidden">{renderMobileList()}</div>
      </div>

      {/* MODAL DETAIL */}
      <LeadDetailModal
        open={isModalOpen}
        lead={selectedLead}
        onCancel={() => setIsModalOpen(false)}
        onDelete={handleDelete}
        getReferralTypeTag={getReferralTypeTag}
      />

      <style jsx global>{`
        .custom-select .ant-select-selector {
          border-radius: 16px !important;
          background: #f8fafc !important;
          border: none !important;
        }
        .premium-table .ant-table-thead > tr > th {
          background: #fff !important;
          color: #94a3b8 !important;
          font-size: 11px !important;
          text-transform: uppercase;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .premium-modal .ant-modal-content {
          border-radius: 35px !important;
          padding: 25px !important;
        }
        .custom-tabs .ant-tabs-ink-bar {
          background: #4f46e5 !important;
          height: 3px !important;
        }
      `}</style>
    </div>
  );
}
