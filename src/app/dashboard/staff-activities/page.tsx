/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import {
  Table,
  Tag,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Badge,
  Tooltip,
  Avatar,
  Divider,
  Empty,
  Spin,
  Alert,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  SearchOutlined,
  ReloadOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ShopOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import * as XLSX from "xlsx";

import {
  getStaffActivities,
  getStaffList,
  getBranches,
  getActivitySummary,
  getActivityPageContext,
} from "@/actions/activity-actions";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

// ==========================================
// MAPS
// ==========================================
const LEAD_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "Mới", color: "blue" },
  ASSIGNED: { label: "Đã phân công", color: "geekblue" },
  FOLLOW_UP: { label: "Theo dõi", color: "purple" },
  CONTACTED: { label: "Đã liên hệ", color: "cyan" },
  INSPECTING: { label: "Đang giám định", color: "orange" },
  PENDING_DEAL_APPROVAL: { label: "Chờ duyệt chốt", color: "gold" },
  DEAL_DONE: { label: "Chốt thành công", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "red" },
  LOSE: { label: "Mất KH", color: "volcano" },
  FROZEN: { label: "Đóng băng", color: "default" },
  PENDING_LOSE_APPROVAL: { label: "Chờ duyệt mất", color: "magenta" },
  REJECTED_APPROVAL: { label: "Từ chối duyệt", color: "red" },
  PENDING_VIEW: { label: "Chờ xem xe", color: "lime" },
};

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  PURCHASE_STAFF: { label: "Thu mua", color: "orange" },
  SALES_STAFF: { label: "Bán hàng", color: "blue" },
  MANAGER: { label: "Quản lý", color: "purple" },
  ADMIN: { label: "Admin", color: "red" },
  SALE_MANAGER: { label: "Trưởng bán hàng", color: "geekblue" },
  ADMIN_MANAGER: { label: "Trưởng hành chính", color: "magenta" },
};

const REFERRAL_TYPE_MAP: Record<string, string> = {
  SELL: "Bán xe",
  BUY: "Mua xe",
  VALUATION: "Định giá",
  SELL_TRADE_NEW: "Đổi mới",
  SELL_TRADE_USED: "Đổi cũ",
};

type Activity = Awaited<ReturnType<typeof getStaffActivities>>[number];
type StaffItem = Awaited<ReturnType<typeof getStaffList>>[number];
type BranchItem = Awaited<ReturnType<typeof getBranches>>[number];
type SummaryItem = Awaited<ReturnType<typeof getActivitySummary>>[number];
type PageContext = Awaited<ReturnType<typeof getActivityPageContext>>;

// ==========================================
// EXCEL EXPORT HELPERS
// ==========================================
function exportDetailExcel(
  activities: Activity[],
  dateRange: [Dayjs, Dayjs],
  isManager: boolean,
) {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Chi tiết hoạt động ---
  const detailRows = activities.map((a, idx) => {
    const row: Record<string, any> = {
      STT: idx + 1,
      Ngày: dayjs(a.createdAt).format("DD/MM/YYYY"),
      Giờ: dayjs(a.createdAt).format("HH:mm:ss"),
      "Khách hàng": a.customer.fullName,
      "Số điện thoại": a.customer.phone,
      "Loại KH": REFERRAL_TYPE_MAP[a.customer.type] ?? a.customer.type,
      "Trạng thái HĐ": LEAD_STATUS_MAP[a.status]?.label ?? a.status,
      "Ghi chú": a.note ?? "",
      "Trễ hạn": a.isLate ? "Có" : "Không",
      "Số phút trễ": a.lateMinutes ?? 0,
    };

    if (isManager) {
      row["Nhân viên"] = a.user.fullName ?? a.user.username;
      row["Loại NV"] = ROLE_MAP[a.user.role]?.label ?? a.user.role;
      row["Chi nhánh"] = a.user.branch?.name ?? "";
    }

    return row;
  });

  // Sắp xếp cột: STT, Ngày, Giờ, [NV nếu manager], KH, ...
  const detailColOrder = isManager
    ? [
        "STT",
        "Ngày",
        "Giờ",
        "Nhân viên",
        "Loại NV",
        "Chi nhánh",
        "Khách hàng",
        "Số điện thoại",
        "Loại KH",
        "Trạng thái HĐ",
        "Ghi chú",
        "Trễ hạn",
        "Số phút trễ",
      ]
    : [
        "STT",
        "Ngày",
        "Giờ",
        "Khách hàng",
        "Số điện thoại",
        "Loại KH",
        "Trạng thái HĐ",
        "Ghi chú",
        "Trễ hạn",
        "Số phút trễ",
      ];

  const detailOrdered = detailRows.map((row) => {
    const ordered: Record<string, any> = {};
    detailColOrder.forEach((col) => {
      ordered[col] = row[col] ?? "";
    });
    return ordered;
  });

  const wsDetail = XLSX.utils.json_to_sheet(detailOrdered);

  // Set column widths
  const colWidths = detailColOrder.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...detailOrdered.map((r) => String(r[col] ?? "").length),
    );
    return { wch: Math.min(maxLen + 4, 40) };
  });
  wsDetail["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsDetail, "Chi tiết hoạt động");

  // --- Sheet 2: Tổng hợp theo trạng thái ---
  const statusCount: Record<string, number> = {};
  activities.forEach((a) => {
    const label = LEAD_STATUS_MAP[a.status]?.label ?? a.status;
    statusCount[label] = (statusCount[label] ?? 0) + 1;
  });

  const summaryByStatus = Object.entries(statusCount)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count], idx) => ({
      STT: idx + 1,
      "Trạng thái": status,
      "Số lượng": count,
      "Tỷ lệ (%)":
        activities.length > 0
          ? ((count / activities.length) * 100).toFixed(1) + "%"
          : "0%",
    }));

  const wsStatus = XLSX.utils.json_to_sheet(summaryByStatus);
  wsStatus["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsStatus, "Theo trạng thái");

  // --- Sheet 3: Tổng hợp theo nhân viên (chỉ manager) ---
  if (isManager) {
    const staffCount: Record<
      string,
      {
        name: string;
        role: string;
        branch: string;
        total: number;
        late: number;
      }
    > = {};

    activities.forEach((a) => {
      const uid = a.createdById;
      if (!staffCount[uid]) {
        staffCount[uid] = {
          name: a.user.fullName ?? a.user.username,
          role: ROLE_MAP[a.user.role]?.label ?? a.user.role,
          branch: a.user.branch?.name ?? "",
          total: 0,
          late: 0,
        };
      }
      staffCount[uid].total += 1;
      if (a.isLate) staffCount[uid].late += 1;
    });

    const summaryByStaff = Object.values(staffCount)
      .sort((a, b) => b.total - a.total)
      .map((s, idx) => ({
        STT: idx + 1,
        "Nhân viên": s.name,
        "Loại NV": s.role,
        "Chi nhánh": s.branch,
        "Tổng hoạt động": s.total,
        "Trễ hạn": s.late,
        "Đúng hạn": s.total - s.late,
        "Tỷ lệ trễ (%)":
          s.total > 0 ? ((s.late / s.total) * 100).toFixed(1) + "%" : "0%",
      }));

    const wsStaff = XLSX.utils.json_to_sheet(summaryByStaff);
    wsStaff["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsStaff, "Theo nhân viên");
  }

  // Tên file: HoatDong_DDMMYYYY-DDMMYYYY.xlsx
  const fileName = `HoatDong_${dateRange[0].format("DDMMYYYY")}-${dateRange[1].format("DDMMYYYY")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function StaffActivitiesPage() {
  const [isPending, startTransition] = useTransition();

  const [ctx, setCtx] = useState<PageContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);
  const [staffType, setStaffType] = useState<
    "ALL" | "PURCHASE_STAFF" | "SALES_STAFF"
  >("ALL");
  const [selectedStaff, setSelectedStaff] = useState<string | undefined>();
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActivityPageContext()
      .then((c: any) => {
        setCtx(c);
        setCtxLoading(false);
      })
      .catch((e: { message: React.SetStateAction<string | null> }) => {
        setError(e.message);
        setCtxLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!ctx || ctx.isStaff) return;
    getBranches().then(setBranches);
    getStaffList("ALL").then(setStaffList);
  }, [ctx]);

  useEffect(() => {
    if (!ctx || ctx.isStaff) return;
    getStaffList(staffType, selectedBranch).then(
      (list: React.SetStateAction<any[]>) => {
        setStaffList(list);
        setSelectedStaff(undefined);
      },
    );
  }, [staffType, selectedBranch]);

  const buildFilter = useCallback(() => {
    if (!ctx) return null;
    return ctx.isStaff
      ? {
          dateFrom: dateRange[0].format("YYYY-MM-DD"),
          dateTo: dateRange[1].format("YYYY-MM-DD"),
        }
      : {
          dateFrom: dateRange[0].format("YYYY-MM-DD"),
          dateTo: dateRange[1].format("YYYY-MM-DD"),
          staffId: selectedStaff,
          staffType,
          branchId: selectedBranch,
        };
  }, [ctx, dateRange, selectedStaff, staffType, selectedBranch]);

  const fetchData = useCallback(() => {
    const filter = buildFilter();
    if (!filter) return;
    setLoading(true);
    setError(null);
    startTransition(() => {
      Promise.all([getStaffActivities(filter), getActivitySummary(filter)])
        .then(([acts, sum]) => {
          setActivities(acts);
          setSummary(sum);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    });
  }, [buildFilter]);

  useEffect(() => {
    if (ctx) fetchData();
  }, [ctx]);

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  const handleExport = useCallback(
    (mode: "current" | "all") => {
      if (!ctx) return;
      setExporting(true);

      if (mode === "current" || activities.length > 0) {
        // Xuất dữ liệu đang hiển thị
        exportDetailExcel(activities, dateRange, !!ctx.isManager);
        setExporting(false);
        return;
      }

      // Nếu chưa có dữ liệu thì fetch trước rồi xuất
      const filter = buildFilter();
      if (!filter) {
        setExporting(false);
        return;
      }
      getStaffActivities(filter).then((acts) => {
        exportDetailExcel(acts, dateRange, !!ctx.isManager);
        setExporting(false);
      });
    },
    [activities, ctx, dateRange, buildFilter],
  );

  const exportMenuItems: MenuProps["items"] = [
    {
      key: "current",
      label: "Xuất dữ liệu hiện tại",
      icon: <FileExcelOutlined />,
      onClick: () => handleExport("current"),
    },
    {
      key: "all",
      label: "Tìm & xuất toàn bộ",
      icon: <DownloadOutlined />,
      onClick: () => handleExport("all"),
    },
  ];

  // ==========================================
  // COLUMNS
  // ==========================================
  const columns: ColumnsType<Activity> = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (v: string) => (
        <Space direction="vertical" size={0}>
          <Text strong>{dayjs(v).format("DD/MM/YYYY")}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(v).format("HH:mm:ss")}
          </Text>
        </Space>
      ),
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    ...(ctx?.isManager
      ? [
          {
            title: "Nhân viên",
            key: "user",
            width: 190,
            render: (_: unknown, record: Activity) => {
              const role = ROLE_MAP[record.user.role] ?? {
                label: record.user.role,
                color: "default",
              };
              return (
                <Space>
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor:
                        role.color === "orange" ? "#fa8c16" : "#1677ff",
                    }}
                  />
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 13 }}>
                      {record.user.fullName ?? record.user.username}
                    </Text>
                    <Space size={4}>
                      <Tag
                        color={role.color}
                        style={{ fontSize: 11, padding: "0 4px" }}
                      >
                        {role.label}
                      </Tag>
                      {record.user.branch && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {record.user.branch.name}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Space>
              );
            },
          },
        ]
      : []),
    {
      title: "Khách hàng",
      key: "customer",
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.customer.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.customer.phone}
          </Text>
          <Tag color="processing" style={{ fontSize: 11, padding: "0 4px" }}>
            {REFERRAL_TYPE_MAP[record.customer.type] ?? record.customer.type}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: string) => {
        const s = LEAD_STATUS_MAP[status] ?? {
          label: status,
          color: "default",
        };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
      filters: Object.entries(LEAD_STATUS_MAP).map(([k, v]) => ({
        text: v.label,
        value: k,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (note: string | null) =>
        note ? (
          <Tooltip title={note}>
            <Text>{note}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Trễ hạn",
      key: "late",
      width: 110,
      render: (_, record) =>
        record.isLate ? (
          <Space size={4}>
            <Badge status="error" />
            <Text type="danger" style={{ fontSize: 12 }}>
              {record.lateMinutes ? `${record.lateMinutes} phút` : "Có"}
            </Text>
          </Space>
        ) : (
          <Space size={4}>
            <Badge status="success" />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đúng hạn
            </Text>
          </Space>
        ),
      filters: [
        { text: "Trễ hạn", value: true },
        { text: "Đúng hạn", value: false },
      ],
      onFilter: (value, record) => record.isLate === value,
    },
  ];

  // ==========================================
  // RENDER
  // ==========================================
  if (ctxLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}
      >
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  if (error && !activities.length) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  const totalActivities = activities.length;
  const lateCount = activities.filter((a) => a.isLate).length;
  const purchaseCount = activities.filter(
    (a) => a.user.role === "PURCHASE_STAFF",
  ).length;
  const salesCount = activities.filter(
    (a) => a.user.role === "SALES_STAFF",
  ).length;
  const uniqueStaff = new Set(activities.map((a) => a.createdById)).size;

  return (
    <div style={{ padding: 24 }}>
      {/* HEADER */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            Hoạt động nhân viên theo ngày
          </Title>
          <Text type="secondary">
            {ctx?.isStaff
              ? `Xem hoạt động của bạn — ${ctx.fullName}`
              : "Theo dõi hoạt động của nhân viên Thu mua & Bán hàng"}
          </Text>
        </div>

        {/* NÚT XUẤT EXCEL */}
        <Dropdown
          menu={{ items: exportMenuItems }}
          placement="bottomRight"
          disabled={activities.length === 0 || exporting}
        >
          <Button
            icon={<FileExcelOutlined />}
            loading={exporting}
            style={{
              borderColor: "#52c41a",
              color: "#52c41a",
              fontWeight: 600,
            }}
          >
            Xuất Excel <DownloadOutlined />
          </Button>
        </Dropdown>
      </div>

      {/* FILTER CARD */}
      <Card
        style={{ marginBottom: 20, borderRadius: 10 }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} lg={ctx?.isStaff ? 10 : 6}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CalendarOutlined /> Khoảng thời gian
              </Text>
              <RangePicker
                style={{ width: "100%" }}
                value={dateRange}
                onChange={(v) => v && setDateRange(v as [Dayjs, Dayjs])}
                format="DD/MM/YYYY"
                allowClear={false}
                presets={[
                  {
                    label: "Hôm nay",
                    value: [dayjs().startOf("day"), dayjs().endOf("day")],
                  },
                  {
                    label: "Hôm qua",
                    value: [
                      dayjs().subtract(1, "day").startOf("day"),
                      dayjs().subtract(1, "day").endOf("day"),
                    ],
                  },
                  {
                    label: "7 ngày qua",
                    value: [
                      dayjs().subtract(6, "day").startOf("day"),
                      dayjs().endOf("day"),
                    ],
                  },
                  {
                    label: "Tháng này",
                    value: [dayjs().startOf("month"), dayjs().endOf("month")],
                  },
                ]}
              />
            </Space>
          </Col>

          {ctx?.isManager && (
            <>
              <Col xs={24} sm={12} lg={4}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <TeamOutlined /> Loại nhân viên
                  </Text>
                  <Select
                    style={{ width: "100%" }}
                    value={staffType}
                    onChange={(v) => setStaffType(v)}
                    options={[
                      { label: "Tất cả", value: "ALL" },
                      { label: "Thu mua", value: "PURCHASE_STAFF" },
                      { label: "Bán hàng", value: "SALES_STAFF" },
                    ]}
                  />
                </Space>
              </Col>

              {ctx.isGlobalManager && (
                <Col xs={24} sm={12} lg={4}>
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: "100%" }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ShopOutlined /> Chi nhánh
                    </Text>
                    <Select
                      style={{ width: "100%" }}
                      value={selectedBranch}
                      onChange={(v) => setSelectedBranch(v)}
                      allowClear
                      placeholder="Tất cả chi nhánh"
                      options={branches.map((b) => ({
                        label: b.name,
                        value: b.id,
                      }))}
                    />
                  </Space>
                </Col>
              )}

              <Col xs={24} sm={12} lg={4}>
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <UserOutlined /> Nhân viên
                  </Text>
                  <Select
                    style={{ width: "100%" }}
                    value={selectedStaff}
                    onChange={(v) => setSelectedStaff(v)}
                    allowClear
                    showSearch
                    placeholder="Tất cả"
                    filterOption={(input, option) =>
                      (option?.label as string)
                        ?.toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={staffList.map((s) => ({
                      label: s.fullName ?? s.username,
                      value: s.id,
                    }))}
                  />
                </Space>
              </Col>
            </>
          )}

          <Col xs={24} lg={ctx?.isStaff ? 14 : 6}>
            <Space
              style={{
                width: "100%",
                justifyContent: "flex-end",
                paddingTop: 20,
              }}
            >
              {ctx?.isManager && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSelectedStaff(undefined);
                    setSelectedBranch(undefined);
                    setStaffType("ALL");
                    setDateRange([
                      dayjs().startOf("day"),
                      dayjs().endOf("day"),
                    ]);
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={fetchData}
                loading={loading || isPending}
              >
                Tìm kiếm
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* STAT CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          {
            title: "Tổng hoạt động",
            value: totalActivities,
            icon: <CalendarOutlined />,
            color: "#1677ff",
          },
          ...(ctx?.isManager
            ? [
                {
                  title: "Nhân viên tham gia",
                  value: uniqueStaff,
                  icon: <UserOutlined />,
                  color: "#52c41a",
                },
                {
                  title: "Thu mua",
                  value: purchaseCount,
                  icon: <TeamOutlined />,
                  color: "#fa8c16",
                },
                {
                  title: "Bán hàng",
                  value: salesCount,
                  icon: <TeamOutlined />,
                  color: "#1677ff",
                },
              ]
            : []),
          {
            title: "Trễ hạn",
            value: lateCount,
            icon: <WarningOutlined />,
            color: "#ff4d4f",
          },
        ].map((stat) => (
          <Col xs={12} sm={8} lg={4} key={stat.title}>
            <Card
              style={{ borderRadius: 10, borderTop: `3px solid ${stat.color}` }}
              styles={{ body: { padding: "14px 16px" } }}
            >
              <Statistic
                title={
                  <Text style={{ fontSize: 12, color: "#888" }}>
                    {stat.icon} {stat.title}
                  </Text>
                }
                value={stat.value}
                valueStyle={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: stat.color,
                }}
              />
            </Card>
          </Col>
        ))}

        {ctx?.isManager && summary.length > 0 && (
          <Col span={24}>
            <Card
              title={
                <Text strong>
                  <ClockCircleOutlined style={{ marginRight: 6 }} />
                  Tổng theo nhân viên
                </Text>
              }
              style={{ borderRadius: 10 }}
              styles={{ body: { padding: "0 0 4px 0" } }}
            >
              <Table
                size="small"
                pagination={false}
                scroll={{ x: 400 }}
                dataSource={summary
                  .sort((a, b) => b.count - a.count)
                  .map((s, i) => ({ ...s, key: i }))}
                columns={[
                  {
                    title: "#",
                    key: "rank",
                    width: 48,
                    render: (_, __, i) => <Text type="secondary">{i + 1}</Text>,
                  },
                  {
                    title: "Nhân viên",
                    key: "user",
                    render: (_, record) => (
                      <Space>
                        <Text strong>
                          {record.user?.fullName ??
                            record.user?.username ??
                            "—"}
                        </Text>
                        {record.user?.role && (
                          <Tag
                            color={
                              ROLE_MAP[record.user.role]?.color ?? "default"
                            }
                            style={{ fontSize: 11 }}
                          >
                            {ROLE_MAP[record.user.role]?.label ??
                              record.user.role}
                          </Tag>
                        )}
                      </Space>
                    ),
                  },
                  {
                    title: "Chi nhánh",
                    key: "branch",
                    render: (_, r) => r.user?.branch?.name ?? "—",
                  },
                  {
                    title: "Số HĐ",
                    key: "count",
                    render: (_, r) => (
                      <Tag
                        color="blue"
                        style={{ fontWeight: 700, fontSize: 14 }}
                      >
                        {r.count}
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        )}
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      {/* BẢNG CHI TIẾT */}
      <Card
        title={
          <Space>
            <Text strong>Chi tiết hoạt động</Text>
            <Tag color="blue">{totalActivities} bản ghi</Tag>
          </Space>
        }
        extra={
          <Dropdown
            menu={{ items: exportMenuItems }}
            placement="bottomRight"
            disabled={activities.length === 0 || exporting}
          >
            <Button
              size="small"
              icon={<FileExcelOutlined style={{ color: "#52c41a" }} />}
              loading={exporting}
            >
              Xuất Excel
            </Button>
          </Dropdown>
        }
        style={{ borderRadius: 10 }}
        styles={{ body: { padding: 0 } }}
      >
        <Spin spinning={loading || isPending}>
          {activities.length === 0 && !loading ? (
            <Empty
              description="Không có dữ liệu trong khoảng thời gian này"
              style={{ padding: 48 }}
            />
          ) : (
            <Table<Activity>
              dataSource={activities}
              columns={columns}
              rowKey="id"
              size="middle"
              scroll={{ x: 800 }}
              pagination={{
                defaultPageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (total) => `Tổng ${total} bản ghi`,
                position: ["bottomRight"],
              }}
              rowClassName={(record) => (record.isLate ? "row-late" : "")}
            />
          )}
        </Spin>
      </Card>

      <style>{`
        .row-late td { background-color: #fff2f0 !important; }
        .row-late:hover td { background-color: #ffe7e4 !important; }
      `}</style>
    </div>
  );
}
