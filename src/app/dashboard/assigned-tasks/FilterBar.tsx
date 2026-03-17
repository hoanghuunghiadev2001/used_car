/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Input, Select, DatePicker, Button, Tooltip } from "antd";
import {
  SearchOutlined,
  CarOutlined,
  FilterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

interface FilterBarProps {
  filters: any;
  setFilters: (f: any) => void;
  onSearch: () => void;
  loading: boolean;
  type: "TASKS" | "CUSTOMERS";
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  onSearch,
  loading,
  type,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end mb-6 bg-slate-50 p-4 rounded-2xl">
      <div className="lg:col-span-3">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
          Khách hàng
        </label>
        <Input
          placeholder="Tên hoặc SĐT..."
          prefix={<SearchOutlined className="text-blue-500" />}
          className="rounded-xl h-11 border-none bg-white shadow-sm"
          value={filters.searchText}
          onChange={(e) =>
            setFilters({ ...filters, searchText: e.target.value })
          }
        />
      </div>

      <div className="lg:col-span-2">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
          Biển số
        </label>
        <Input
          placeholder="Biển số xe"
          prefix={<CarOutlined />}
          className="rounded-xl h-11 border-none bg-white shadow-sm uppercase"
          value={filters.licensePlate}
          onChange={(e) =>
            setFilters({ ...filters, licensePlate: e.target.value })
          }
        />
      </div>
      <div className="lg:col-span-2">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
          Trạng thái GĐ
        </label>
        <Select
          className="w-full h-11 custom-select"
          value={filters.inspectStatus}
          onChange={(val) => setFilters({ ...filters, inspectStatus: val })}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "✅ Đã xem xe", value: "INSPECTED" },
            { label: "📅 Hẹn xem xe", value: "APPOINTED" },
            { label: "❌ Chưa xem xe", value: "NOT_INSPECTED" },
          ]}
        />
      </div>

      <div className="lg:col-span-3">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
          Ngày nhận Lead
        </label>
        <DatePicker.RangePicker
          className="w-full h-11 rounded-xl border-none shadow-sm"
          format="DD/MM/YYYY"
          value={filters.dateRange}
          onChange={(val) => setFilters({ ...filters, dateRange: val })}
        />
      </div>

      <div className="lg:col-span-2 flex gap-2">
        <Button
          type="primary"
          icon={<FilterOutlined />}
          loading={loading}
          onClick={onSearch}
          className="flex-1 h-11 rounded-xl bg-slate-800 border-none font-bold"
        >
          LỌC DỮ LIỆU
        </Button>
        <Tooltip title="Xóa lọc">
          <Button
            icon={<ReloadOutlined />}
            className="h-11 w-11 rounded-xl bg-white border-none text-slate-400"
            onClick={() =>
              setFilters({
                searchText: "",
                licensePlate: "",
                inspectStatus: "ALL",
                dateRange: null,
              })
            }
          />
        </Tooltip>
      </div>
    </div>
  );
};
