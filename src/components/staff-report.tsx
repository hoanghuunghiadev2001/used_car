/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Filter,
  Calendar,
  Flame,
  Car,
  CheckCircle2,
  AlertTriangle,
  Users, // Thay DollarSign bằng Users
  ArrowUpRight,
  Search,
  Info,
} from "lucide-react";

const COLORS = ["#ef4444", "#f97316", "#3b82f6", "#10b981"];

export default function AdvancedStaffDashboard({
  initialData,
}: {
  initialData: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Lấy filter hiện tại từ URL, mặc định là month
  const currentFilter = searchParams.get("period") || "month";
  if (!initialData || !initialData.data) {
    return (
      <div className="p-4 text-center">
        Đang tải dữ liệu hoặc có lỗi xảy ra...
      </div>
    );
    // Hoặc return <LoadingSkeleton /> tùy giao diện của bạn
  }
  const { funnel, leadQuality, taskStats, trend, rawLeads } =
    initialData?.data || {};

  // Hàm xử lý chuyển đổi Filter bằng URL
  const handleFilterChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Báo cáo hiệu suất
          </h1>
          <p className="text-slate-500 text-sm italic">
            Dữ liệu cá nhân cập nhật thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          {["day", "month", "year"].map((p) => (
            <button
              key={p}
              onClick={() => handleFilterChange(p)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentFilter === p
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <button className="flex items-center gap-2 text-xs font-bold text-blue-600 pr-2 hover:opacity-70">
            <Calendar className="w-4 h-4" /> CUSTOM
          </button>
        </div>
      </div>

      {/* 1. KPI SUMMARY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="TỔNG KHÁCH MỚI"
          value={funnel.total}
          unit="KHÁCH"
          icon={<Users />}
          color="blue"
          trend="Trong kỳ"
        />
        <KpiCard
          title="TỶ LỆ CHỐT"
          value={Math.round((funnel.deals / funnel.total) * 100) || 0}
          unit="%"
          icon={<ArrowUpRight />}
          color="emerald"
          trend="+2.1% mục tiêu"
        />
        <KpiCard
          title="KHÁCH HOT"
          value={leadQuality.hot}
          unit="LEADS"
          icon={<Flame />}
          color="red"
          trend="Cần xử lý ngay"
        />
        <KpiCard
          title="NHIỆM VỤ TRỄ"
          value={taskStats.late}
          unit="TASKS"
          icon={<AlertTriangle />}
          color="amber"
          trend="Ảnh hưởng KPI"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. CONVERSION FUNNEL */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" /> PHỄU KHÁCH HÀNG
            </h3>
            <Info className="w-4 h-4 text-slate-300" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <FunnelStep
              label="Tiếp cận"
              value={funnel.total}
              color="bg-slate-100"
            />
            <FunnelStep
              label="Đã liên hệ"
              value={funnel.contacted}
              color="bg-blue-50 text-blue-600"
            />
            <FunnelStep
              label="Đã xem xe"
              value={funnel.inspected}
              color="bg-indigo-50 text-indigo-600"
            />
            <FunnelStep
              label="Chốt Deal"
              value={funnel.deals}
              color="bg-emerald-50 text-emerald-600"
            />
          </div>

          {/* FIX LỖI CHART: Bọc div có height và min-width */}
          <div className="h-[250px] w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  dot={{
                    r: 6,
                    fill: "#3b82f6",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. LEAD QUALITY HEATMAP */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 uppercase text-sm tracking-widest">
            Phân tích chất lượng Lead
          </h3>
          <div className="h-[250px] mb-6 w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "HOT", value: leadQuality.hot },
                    { name: "WARM", value: leadQuality.warm },
                    { name: "COOL", value: leadQuality.cool },
                    { name: "FROZEN", value: leadQuality.frozen },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-auto">
            <QualityRow
              label="Nguy cơ đóng băng"
              value={leadQuality.frozen}
              color="bg-gray-400"
            />
            <QualityRow
              label="Lead trễ xử lý"
              value={leadQuality.late}
              color="bg-red-600"
            />
            <QualityRow
              label="Hiệu suất Task"
              value={`${Math.round((taskStats.completed / (taskStats.total || 1)) * 100)}%`}
              color="bg-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 4. CHI TIẾT DANH SÁCH */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800 italic uppercase">
            Danh sách khách hàng trong kỳ
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm nhanh..."
              className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm w-full md:w-[300px] focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Dòng xe</th>
                <th className="px-6 py-4">Tình trạng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Giá đề xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rawLeads.map((c: any) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 transition-all group"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700 text-sm">
                      {c.fullName}
                    </div>
                    <div className="text-[10px] text-slate-400">{c.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Car className="w-4 h-4 text-slate-300" />
                      {c.carModel?.name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-block ${
                        c.inspectStatus === "INSPECTED"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.inspectStatus === "INSPECTED"
                        ? "ĐÃ XEM XE"
                        : "CHƯA XEM XE"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        c.urgencyLevel === "HOT"
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          : c.urgencyLevel === "WARM"
                            ? "bg-orange-400"
                            : "bg-blue-400"
                      }`}
                    />
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-700 text-sm">
                    {Number(c.leadCar?.finalPrice || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Giữ nguyên các component con (KpiCard, FunnelStep, QualityRow) từ code cũ của bạn
function KpiCard({ title, value, unit, icon, color, trend }: any) {
  const colorSchemes: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
      <div
        className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform text-slate-900`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
        {title}
      </p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-slate-800">
          {value.toLocaleString()}
        </h3>
        <span className="text-xs font-bold text-slate-400">{unit}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-lg ${colorSchemes[color]}`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, color }: any) {
  return (
    <div className={`p-4 rounded-2xl text-center ${color}`}>
      <div className="text-xl font-black">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">
        {label}
      </div>
    </div>
  );
}

function QualityRow({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <span className="text-xs font-black text-slate-700">{value}</span>
    </div>
  );
}
