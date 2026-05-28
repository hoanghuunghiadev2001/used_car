/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Card,
  Typography,
  message,
  Space,
  Button,
  Input,
  Select,
  Row,
  Col,
  Badge,
  Tag,
  Tooltip,
} from "antd";
import {
  FileProtectOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  UserOutlined,
  CarOutlined,
  EyeOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  getContractsAction,
  completeContractAction,
  getContractDetailAction,
  uploadContractFileAction, // Vẫn dùng Action này nhưng tham số truyền vào giờ chỉ là ID Google Drive rất nhẹ
  getStaffForFilterAction,
} from "@/actions/contract-actions";
import ModalContractDetail from "@/components/ModalContractDetail";

const { Title, Text } = Typography;

export default function ContractPage() {
  // --- States ---
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [filters, setFilters] = useState({
    contractNumber: "",
    customerName: "",
    licensePlate: "",
    staffId: undefined as string | undefined,
  });

  // --- Logic tải dữ liệu ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, staff] = await Promise.all([
        getContractsAction(filters),
        getStaffForFilterAction(),
      ]);
      setContracts(data);
      setStaffList(staff);
    } catch (error: any) {
      message.error("Không thể kết nối với máy chủ");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 🚀 LUỒNG MỚI: BỎ BASE64, UPLOAD THẲNG FILE VẬT LÝ LÊN GOOGLE DRIVE
  const handleFileUpload = async (file: File) => {
    if (!selectedContract) return;

    // 1. Kiểm tra định dạng (PDF hoặc Ảnh scan)
    const isDoc =
      file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isDoc) {
      return message.error("Chỉ chấp nhận tệp PDF hoặc hình ảnh scan");
    }

    // Giới hạn dung lượng dưới 10MB theo cấu hình Route Drive API
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      return message.error("Hồ sơ hợp đồng vượt quá giới hạn 10MB!");
    }

    setUploading(true);

    try {
      // 2. Tạo FormData đóng gói file vật lý
      const formData = new FormData();
      formData.append("file", file);

      // 3. Đẩy file lên API Endpoint tích hợp OAuth2 Google Drive
      const response = await fetch("/api/uploadFile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Lỗi tương tác hạ tầng Google Drive API.");
      }

      const data = await response.json();

      // Lấy chuỗi ID gọn nhẹ trả về từ Google Drive (Ví dụ: 1TjPkbpE7LlH8...)
      const googleDriveId = data.fileId;

      if (!googleDriveId) {
        throw new Error("Không nhận được định danh FileId từ Google.");
      }

      // 4. Gọi Server Action để lưu đúng chuỗi ID (hoặc link xem nếu DB cũ thiết kế dạng chuỗi URL) vào Database
      // Khuyên dùng: Lưu nguyên cái googleDriveId vào cột trường dữ liệu này
      const res = await uploadContractFileAction(
        selectedContract.id,
        googleDriveId, // <-- Database bây giờ lưu chuỗi ID siêu nhẹ, không lưu text base64 cồng kềnh nữa
      );

      if (res.success) {
        message.success(
          "Bản scan đã được đồng bộ lên Google Drive doanh nghiệp!",
        );

        // 5. Refresh lại giao diện chi tiết hồ sơ hợp đồng
        const updatedDetail = await getContractDetailAction(
          selectedContract.id,
        );
        setSelectedContract(updatedDetail);

        if (typeof loadData === "function") loadData();
      } else {
        throw new Error(res.error || "Lỗi lưu trữ thông tin vào DB");
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      message.error(
        error.message ||
          "Không thể tải tệp lên. Vui lòng kiểm tra lại hệ thống.",
      );
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 500); // Debounce tìm kiếm
    return () => clearTimeout(timer);
  }, [loadData]);

  // --- Handlers ---
  const handleOpenDetail = async (id: string) => {
    setLoading(true);
    try {
      const detail = await getContractDetailAction(id);
      setSelectedContract(detail);
      setIsDetailOpen(true);
    } catch (error) {
      message.error("Lỗi khi tải chi tiết hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string, no: string) => {
    const res = await completeContractAction(id);
    if (res.success) {
      message.success(`Hợp đồng ${no} đã hoàn tất và xuất kho!`);
      loadData();
      setIsDetailOpen(false);
    } else {
      message.error(res.error || "Giao dịch thất bại");
    }
  };

  const resetFilters = () => {
    setFilters({
      contractNumber: "",
      customerName: "",
      licensePlate: "",
      staffId: undefined,
    });
  };

  // --- Cấu trúc bảng ---
  const columns = [
    {
      title: "MÃ HỢP ĐỒNG",
      dataIndex: "contractNumber",
      width: 140,
      render: (t: string) => (
        <Text strong className="text-indigo-600 font-mono tracking-tighter">
          {t}
        </Text>
      ),
    },
    {
      title: "KHÁCH HÀNG",
      key: "customer",
      render: (r: any) => (
        <div className="flex flex-col">
          <Text strong>{r.customer?.fullName}</Text>
          <Text type="secondary" className="text-[11px]">
            {r.customer?.phone}
          </Text>
        </div>
      ),
    },
    {
      title: "THÔNG TIN XE",
      key: "car",
      render: (r: any) => (
        <div className="flex flex-col">
          <Text className="text-xs font-medium text-slate-600">
            {r.car?.modelName}
          </Text>
          <Tag color="blue" className="w-fit m-0 text-[10px] font-mono">
            {r.car?.licensePlate || "CHƯA CÓ BIỂN"}
          </Tag>
        </div>
      ),
    },
    {
      title: "GIÁ TRỊ",
      dataIndex: "totalAmount",
      align: "right" as any,
      render: (val: any) => (
        <Text strong className="text-rose-600">
          {Number(val).toLocaleString()} đ
        </Text>
      ),
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      width: 120,
      render: (s: string) => {
        const config: any = {
          SIGNED: { color: "blue", text: "ĐÃ KÝ" },
          COMPLETED: { color: "green", text: "HOÀN TẤT" },
          DRAFT: { color: "default", text: "NHÁP" },
          CANCELLED: { color: "red", text: "ĐÃ HỦY" },
        };
        return (
          <Tag
            color={config[s]?.color}
            className="font-bold border-none px-3 rounded-full"
          >
            {config[s]?.text}
          </Tag>
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 60,
      fixed: "right" as any,
      render: (r: any) => (
        <Tooltip title="Xem chi tiết">
          <Button
            shape="circle"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(r.id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="max-w-[1400px] mx-auto mb-8 bg-white p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <Space size={20}>
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <FileProtectOutlined className="text-2xl" />
          </div>
          <div>
            <Title level={3} className="m-0! tracking-tight">
              Hợp đồng Giao dịch
            </Title>
            <Text type="secondary" className="text-xs">
              <Badge status="processing" className="mr-2" />
              Theo dõi tiến độ thanh toán và đối soát pháp lý hồ sơ
            </Text>
          </div>
        </Space>
        <Space>
          <Button
            size="large"
            icon={<ClearOutlined />}
            className="rounded-2xl border-none bg-slate-100 font-bold"
            onClick={resetFilters}
          >
            XÓA LỌC
          </Button>
          <Button
            size="large"
            type="primary"
            icon={<ClockCircleOutlined />}
            className="rounded-2xl shadow-lg px-8 font-bold"
            onClick={loadData}
          >
            LÀM MỚI
          </Button>
        </Space>
      </div>

      {/* FILTER BAR */}
      <div className="max-w-[1400px] mx-auto mb-6">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              size="large"
              placeholder="Mã hợp đồng..."
              prefix={<SearchOutlined className="text-slate-300" />}
              className="rounded-2xl border-none shadow-sm h-12"
              value={filters.contractNumber}
              onChange={(e) =>
                setFilters({ ...filters, contractNumber: e.target.value })
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              size="large"
              placeholder="Tên khách hàng..."
              prefix={<UserOutlined className="text-slate-300" />}
              className="rounded-2xl border-none shadow-sm h-12"
              value={filters.customerName}
              onChange={(e) =>
                setFilters({ ...filters, customerName: e.target.value })
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              size="large"
              placeholder="Biển số xe..."
              prefix={<CarOutlined className="text-slate-300" />}
              className="rounded-2xl border-none shadow-sm h-12"
              value={filters.licensePlate}
              onChange={(e) =>
                setFilters({ ...filters, licensePlate: e.target.value })
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              size="large"
              className="w-full h-12 rounded-2xl shadow-sm border-none bg-white"
              placeholder="Nhân viên phụ trách"
              allowClear
              value={filters.staffId}
              onChange={(val) => setFilters({ ...filters, staffId: val })}
              options={staffList.map((s) => ({
                label: s.fullName,
                value: s.id,
              }))}
            />
          </Col>
        </Row>
      </div>

      {/* TABLE SECTION */}
      <div className="max-w-[1400px] mx-auto">
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white/80 backdrop-blur-md">
          <Table
            dataSource={contracts}
            columns={columns}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              position: ["bottomCenter"],
              itemRender: (page, type, originalElement) => {
                if (type === "prev")
                  return (
                    <Button type="text" className="text-xs">
                      Trước
                    </Button>
                  );
                if (type === "next")
                  return (
                    <Button type="text" className="text-xs">
                      Sau
                    </Button>
                  );
                return originalElement;
              },
            }}
            onRow={(record) => ({
              onClick: () => handleOpenDetail(record.id),
              className: "cursor-pointer hover:bg-indigo-50/30 transition-all",
            })}
          />
        </Card>
      </div>

      {/* MODAL CHI TIẾT */}
      <ModalContractDetail
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        data={selectedContract}
        onComplete={handleComplete}
        onFileUpload={handleFileUpload}
        uploading={uploading}
      />

      <style jsx global>{`
        .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          font-weight: 800 !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .ant-table-row:hover > td {
          background-color: #f5f8ff !important;
        }
        .ant-input-large,
        .ant-select-large .ant-select-selector {
          border-radius: 1rem !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
