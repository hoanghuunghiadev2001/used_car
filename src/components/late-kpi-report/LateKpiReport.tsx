/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react"; // Thêm useCallback
import {
  Table,
  DatePicker,
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Select,
  Tooltip,
} from "antd";
import {
  ClockCircleOutlined,
  WarningOutlined,
  UserOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

export default function LateKpiReport({
  currentUser,
  initialStaff,
  initialBranches,
  initialData,
}: {
  currentUser: any;
  initialStaff: any;
  initialBranches: any;
  initialData: any[];
}) {
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin =
    currentUser?.role === "ADMIN" || currentUser?.isGlobalManager;

  const [filter, setFilter] = useState<{
    dates: any;
    userId: string | undefined;
    branchId: string | undefined;
  }>({
    dates: null,
    userId: undefined,
    branchId: undefined,
  });

  const formatLateTime = (totalMinutes: number) => {
    if (totalMinutes <= 0) return "Đúng giờ";

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} phút`);

    return `Trễ ${parts.join(" ")}`;
  };

  // 1. Dùng useCallback để hàm loadData không bị khởi tạo lại vô ích
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let fromDate = undefined;
      let toDate = undefined;

      // Xử lý lấy ngày tháng nếu có chọn trong RangePicker
      if (filter.dates && filter.dates.length === 2) {
        fromDate = filter.dates[0].startOf("day").toDate();
        toDate = filter.dates[1].endOf("day").toDate();
      }

      const { getLateReportAction } = await import("@/actions/report-actions");
      const res = await getLateReportAction({
        fromDate,
        toDate,
        userId: filter.userId,
        branchId: filter.branchId,
      });
      setData(res);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [filter.userId, filter.branchId, filter.dates]); // Chỉ định nghĩa lại hàm nếu filter thay đổi

  // 2. useEffect chỉ kích hoạt khi bộ lọc thực sự có sự thay đổi (tránh loadData lần đầu vì đã có initialData)
  useEffect(() => {
    const isFilterActive =
      filter.dates !== null ||
      filter.userId !== undefined ||
      filter.branchId !== undefined;

    if (isFilterActive) {
      loadData();
    }
  }, [loadData]); // Bây giờ đưa loadData vào đây là an toàn

  const totalLateMinutes = data.reduce(
    (sum, item) => sum + (item.lateMinutes || 0),
    0,
  );

  const columns = [
    {
      title: "NHÂN VIÊN",
      key: "user",
      render: (record: any) => (
        <Space>
          <div className="bg-slate-100 p-2 rounded-lg">
            <UserOutlined className="text-slate-500" />
          </div>
          <div>
            <div className="font-bold text-slate-800">
              {record.user?.fullName}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">
              {record.user?.branch?.name}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "ĐỐI SOÁT THỜI GIAN",
      width: 350,
      render: (record: any) => {
        const actual = dayjs(record.createdAt);
        const scheduled = actual.subtract(record.lateMinutes || 0, "minute");
        return (
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-[9px] text-gray-400 uppercase">Hẹn</div>
              <div className="font-bold text-blue-600">
                {scheduled.format("HH:mm  DD/MM/YYYY")}
              </div>
            </div>
            <ArrowRightOutlined className="text-gray-300 mx-2" />
            <div className="text-center flex-1">
              <div className="text-[9px] text-gray-400 uppercase">Thực tế</div>
              <div className="font-bold text-red-500">
                {actual.format("HH:mm DD/MM/YYYY")}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "VI PHẠM",
      dataIndex: "lateMinutes",
      align: "center" as const,
      render: (min: number) => (
        <Tooltip title="Trễ so với giờ hẹn">
          <Tag
            color={min > 60 ? "#f5222d" : "#faad14"}
            className="rounded-md border-none font-bold px-3 py-1"
          >
            {formatLateTime(min)}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "KHÁCH HÀNG",
      render: (record: any) => (
        <div>
          <div className="font-medium text-[13px]">
            {record.customer?.fullName}
          </div>
          <div className="text-[11px] text-gray-400">
            {record.customer?.phone}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Title
              level={2}
              className="m-0! font-black text-slate-800 tracking-tight uppercase"
            >
              Truy xuất vi phạm KPI
            </Title>
            <Text type="secondary">Báo cáo phản hồi khách hàng chậm trễ</Text>
          </div>

          <Card
            size="small"
            className="shadow-sm border-none bg-white rounded-xl w-full md:w-auto"
          >
            <Space
              split={
                <div className="hidden md:block w-[1px] h-8 bg-slate-100" />
              }
              wrap
            >
              {isSuperAdmin && (
                <div className="px-2">
                  <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <EnvironmentOutlined /> Chi nhánh
                  </div>
                  <Select
                    placeholder="Tất cả chi nhánh"
                    allowClear
                    className="w-full md:w-45"
                    value={filter.branchId}
                    options={initialBranches?.map((b: any) => ({
                      label: b.name,
                      value: b.id,
                    }))}
                    onChange={(val) =>
                      setFilter({ ...filter, branchId: val, userId: undefined })
                    }
                  />
                </div>
              )}

              <div className="px-2">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                  <UserOutlined /> Nhân viên
                </div>
                <Select
                  placeholder="Chọn nhân viên"
                  allowClear
                  className="w-full md:w-[200px]"
                  value={filter.userId}
                  options={initialStaff
                    ?.filter(
                      (s: any) =>
                        !filter.branchId || s.branchId === filter.branchId,
                    )
                    .map((s: any) => ({ label: s.fullName, value: s.id }))}
                  onChange={(val) => setFilter({ ...filter, userId: val })}
                />
              </div>

              <div className="px-2">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">
                  Thời gian
                </div>
                <RangePicker
                  placeholder={["Bắt đầu", "Kết thúc"]}
                  allowClear
                  value={filter.dates}
                  onChange={(val) => setFilter({ ...filter, dates: val })}
                  className="border-none bg-slate-50 w-full"
                />
              </div>
            </Space>
          </Card>
        </header>

        {/* STATISTICS SECTION */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={8}>
            <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-white to-red-50">
              <Statistic
                title="SỐ LẦN TRỄ"
                value={data.length}
                style={{ color: "#ef4444", fontWeight: 900 }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-white to-orange-50">
              <Statistic
                title="TỔNG THỜI GIAN"
                value={totalLateMinutes}
                suffix="PHÚT"
                style={{ color: "#f59e0b", fontWeight: 900 }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-white to-blue-50">
              <Statistic
                title="TRUNG BÌNH/CA"
                value={
                  data.length ? Math.round(totalLateMinutes / data.length) : 0
                }
                suffix="PHÚT"
                style={{ color: "#3b82f6", fontWeight: 900 }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          className="rounded-2xl shadow-xl overflow-hidden"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 8, className: "p-6" }}
          />
        </Card>
      </div>
    </div>
  );
}
