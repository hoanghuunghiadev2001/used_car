/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Card,
  App,
  Typography,
  Space,
  Avatar,
  Badge,
  Tooltip,
  Empty,
  message,
} from "antd";
import {
  FileSearchOutlined,
  StopOutlined,
  CarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  ShoppingCartOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";

// Actions
import {
  getPendingApprovalsAction,
  approveCarPurchase,
  approveLoseRequestAction,
  approveDealAction,
} from "@/actions/task-actions";
import { getCarModelsAction } from "@/actions/car-actions";
import { getCustomerHistoryAction } from "@/actions/lead-actions";

// Components
import ModalApprovalDetail from "@/components/approval-customer/ApprovalDetailModal";
import ModalApproveLose from "@/components/assigned-tasks/ModalApproveLose";
import ModalApprovalSalesDetail from "@/components/approval-customer/ModalApprovalSalesDetail";
import dayjs from "dayjs";

const { Text, Title } = Typography;

export default function ApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [carModels, setCarModels] = useState<any[]>([]);

  // State quản lý Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isLoseModalOpen, setIsLoseModalOpen] = useState(false);
  const [isSalesDealModalOpen, setIsSalesDealModalOpen] = useState(false);

  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [customerHistory, setCustomerHistory] = useState<any>(null);

  // --- LOGIC TẢI DỮ LIỆU ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [resApprovals, resModels] = await Promise.all([
        getPendingApprovalsAction(),
        getCarModelsAction(),
      ]);
      setData(resApprovals as any);
      setCarModels(resModels);
    } catch (error) {
      messageApi.error("Lỗi tải dữ liệu phê duyệt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCloseModals = () => {
    setIsPurchaseModalOpen(false);
    setIsLoseModalOpen(false);
    setIsSalesDealModalOpen(false);
    setSelectedActivity(null);
  };

  // --- ĐIỀU KIỆN MỞ MODAL THEO NGHIỆP VỤ ---
  const openApprovalModal = async (record: any) => {
    console.log(record);

    setSelectedActivity(record);
    setHistoryLoading(true);

    setLoading(true);

    try {
      // Gọi action lấy lịch sử chăm sóc dựa trên customerId của yêu cầu phê duyệt
      const historyRes = await getCustomerHistoryAction(record.customer.id);
      setCustomerHistory(historyRes);

      // Sau khi có lịch sử mới mở Modal tương ứng
      if (record.status === "PENDING_DEAL_APPROVAL") {
        if (record.customer?.type === "BUY") {
          setIsSalesDealModalOpen(true);
        } else {
          setIsPurchaseModalOpen(true);
        }
      } else if (record.status === "PENDING_LOSE_APPROVAL") {
        setIsLoseModalOpen(true);
      }
    } catch (error) {
      messageApi.error("Không thể tải lịch sử chăm sóc khách hàng");
    } finally {
      setHistoryLoading(false);
      setLoading(false);
    }
  };

  // --- XỬ LÝ ACTIONS PHÊ DUYỆT ---
  const handleApproveSales = async (updatedData: any) => {
    setLoading(true);

    try {
      const res = await approveDealAction(
        selectedActivity.id,
        updatedData.isReject ? "REJECT" : "APPROVE",
        updatedData.adminNote,
        updatedData.contractNo,
      );
      if (res.success) {
        messageApi.success(
          updatedData.isReject
            ? "Đã từ chối chốt đơn"
            : "Phê duyệt bán thành công!",
        );
        handleCloseModals();
        loadData();
      } else messageApi.error((res as any).error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePurchase = async (updatedData: any) => {
    setLoading(true);
    try {
      const res = await approveCarPurchase(
        selectedActivity.id,
        updatedData.isReject ? "REJECT" : "APPROVE",
        updatedData.adminNote,
        updatedData,
      );
      if (res.success) {
        messageApi.success(
          updatedData.isReject
            ? "Đã từ chối nhập kho"
            : "Xe đã nhập kho thành công!",
        );
        handleCloseModals();
        loadData();
      } else messageApi.error(res.error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDecisionLose = async (
    id: string,
    decision: "APPROVE" | "REJECT",
    target?: string,
    note?: string,
  ) => {
    setLoading(true);
    try {
      const res = await approveLoseRequestAction(id, decision, target, note);

      if (res.success) {
        // ✅ THÀNH CÔNG: Thông báo, đóng modal và tải lại dữ liệu
        messageApi.success("Thao tác thành công");
        handleCloseModals();
        await loadData(); // Chờ load data xong mới tắt loading
      } else {
        // ❌ THẤT BẠI: Chỉ thông báo lỗi, KHÔNG đóng modal
        // Lúc này các lỗi như "Hồ sơ đang chờ duyệt" sẽ hiển thị rõ ràng
        messageApi.error(res.error || "Có lỗi xảy ra");
      }
    } catch (error: any) {
      messageApi.error("Lỗi hệ thống: " + error.message);
    } finally {
      // ✅ CHỈ TẮT LOADING: Không thực hiện logic đóng/mở ở đây
      setLoading(false);
    }
  };

  // --- RENDER TAG TRẠNG THÁI (Dùng cho cả Desktop & Mobile) ---
  const renderTypeTag = (record: any) => {
    const isDeal = record.status === "PENDING_DEAL_APPROVAL";
    const isSales = record.customer?.type === "BUY";

    if (isDeal) {
      return (
        <Tag
          color={isSales ? "cyan" : "green"}
          className="rounded-lg px-2 py-0.5 font-bold border-none uppercase text-[10px]"
        >
          {isSales ? (
            <ShoppingCartOutlined className="mr-1" />
          ) : (
            <CarOutlined className="mr-1" />
          )}
          {isSales ? "Yêu cầu Bán" : "Yêu cầu Thu"}
        </Tag>
      );
    }
    return (
      <Tag
        color="volcano"
        className="rounded-lg px-2 py-0.5 font-bold border-none uppercase text-[10px]"
      >
        <StopOutlined className="mr-1" /> Dừng hồ sơ
      </Tag>
    );
  };

  return (
    <div className="p-3 md:p-8 bg-[#f8fafc] min-h-screen">
      {contextHolder}
      <div className="max-w-6xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-xl hidden md:block">
              <FileSearchOutlined className="text-xl text-blue-600" />
            </div>
            <div>
              <Title
                level={4}
                className="m-0! font-black uppercase tracking-tight text-base md:text-xl"
              >
                Trung tâm Phê duyệt
              </Title>
              <Text className="text-[10px] md:text-xs uppercase font-bold tracking-widest text-slate-400">
                Đang chờ:{" "}
                <span className="text-blue-600">{data.length} yêu cầu</span>
              </Text>
            </div>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
            className="rounded-xl font-bold h-10 md:h-11 px-4 mt-3 md:mt-0 w-full md:w-auto shadow-sm"
          >
            LÀM MỚI
          </Button>
        </div>

        {/* 1. MOBILE VIEW: LIST CARD (Hiển thị trên Mobile) */}
        <div className="block md:hidden space-y-3">
          {data.length === 0 && !loading && (
            <Card className="rounded-2xl text-center p-10">
              <Empty description="Tất cả đã được xử lý" />
            </Card>
          )}
          {data.map((r) => (
            <Card
              key={r.id}
              className="rounded-2xl border-none shadow-sm active:scale-[0.98] transition-all bg-white"
              onClick={() => openApprovalModal(r)}
            >
              <div className="flex justify-between items-start mb-2">
                {renderTypeTag(r)}
                <Text className="text-[10px] text-slate-400 font-mono">
                  {dayjs(r.createdAt).format("HH:mm DD/MM")}
                </Text>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <Avatar
                  className="bg-blue-100 text-blue-600"
                  icon={<UserOutlined />}
                />
                <div className="flex flex-col overflow-hidden">
                  <Text strong className="text-sm truncate">
                    {r.customer?.fullName}
                  </Text>
                  <Text type="secondary" className="text-[11px]">
                    Bởi: {r.user?.fullName}
                  </Text>
                </div>
                <RightOutlined className="ml-auto text-slate-300 text-xs" />
              </div>
              <div className="bg-slate-50 p-2 rounded-lg italic text-[11px] text-slate-500 line-clamp-2 border border-slate-100">
                {r.note}
              </div>
            </Card>
          ))}
        </div>

        {/* 2. DESKTOP VIEW: TABLE (Hiển thị trên PC) */}
        <Card className="hidden md:block shadow-xl rounded-[2.5rem] border-none overflow-hidden bg-white/90 backdrop-blur-md">
          <Table
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            className="custom-approval-table"
            columns={[
              {
                title: "KHÁCH HÀNG",
                width: 250,
                render: (r) => (
                  <Space size={12}>
                    <Avatar
                      className="bg-slate-100 text-slate-600"
                      icon={<UserOutlined />}
                    />
                    <div className="flex flex-col">
                      <Text strong className="text-base leading-tight">
                        {r.customer?.fullName}
                      </Text>
                      <Space
                        size={4}
                        className="text-[11px] text-slate-400 font-mono"
                      >
                        <ClockCircleOutlined />{" "}
                        {dayjs(r.createdAt).format("HH:mm - DD/MM/YYYY")}
                      </Space>
                    </div>
                  </Space>
                ),
              },
              {
                title: "LOẠI YÊU CẦU",
                render: (s, record) => renderTypeTag(record),
              },
              {
                title: "NHÂN VIÊN ĐỀ XUẤT",
                render: (r) => (
                  <div className="flex items-center gap-2 font-semibold text-slate-600">
                    <Badge status="processing" color="blue" />{" "}
                    {r.user?.fullName}
                  </div>
                ),
              },
              {
                title: "GHI CHÚ",
                ellipsis: true,
                render: (r) => (
                  <Tooltip title={r.note}>
                    <Text
                      type="secondary"
                      className="text-xs italic truncate max-w-xs block text-slate-500"
                    >
                      {r.note}
                    </Text>
                  </Tooltip>
                ),
              },
              {
                title: "THAO TÁC",
                align: "right",
                render: (r) => (
                  <Button
                    type="primary"
                    className="rounded-xl font-bold bg-blue-600 hover:scale-105 transition-all shadow-md h-10"
                    icon={<ArrowRightOutlined />}
                    onClick={() => openApprovalModal(r)}
                  >
                    XỬ LÝ
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* --- CÁC MODALS PHÊ DUYỆT --- */}
      {isPurchaseModalOpen && (
        <ModalApprovalDetail
          isOpen={isPurchaseModalOpen}
          onClose={handleCloseModals}
          selectedActivity={selectedActivity}
          carModels={carModels}
          loading={loading}
          onApprove={handleApprovePurchase}
          onReject={(reason) =>
            handleApprovePurchase({ adminNote: reason, isReject: true })
          }
        />
      )}

      {isSalesDealModalOpen && (
        <ModalApprovalSalesDetail
          isOpen={isSalesDealModalOpen}
          onClose={handleCloseModals}
          selectedActivity={selectedActivity}
          loading={loading}
          onApprove={handleApproveSales}
          onReject={(reason) =>
            handleApproveSales({ adminNote: reason, isReject: true })
          }
        />
      )}

      {isLoseModalOpen && (
        <ModalApproveLose
          isOpen={isLoseModalOpen}
          onClose={handleCloseModals}
          selectedActivity={selectedActivity}
          loading={loading || historyLoading}
          onConfirm={handleAdminDecisionLose}
          history={customerHistory.data}
        />
      )}

      <style jsx global>{`
        .custom-approval-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          color: #94a3b8 !important;
          letter-spacing: 1px;
          font-weight: 800 !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .custom-approval-table .ant-table-row:hover {
          background-color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
}
