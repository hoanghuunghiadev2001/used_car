/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Typography,
  Tabs,
  Badge,
  message,
  Segmented,
  Skeleton,
  Empty,
} from "antd";
import { TeamOutlined, UserAddOutlined } from "@ant-design/icons";

// --- ACTIONS ---
import {
  getMyTasksAction,
  getAvailableCars,
  getActiveReasonsAction,
  requestPurchaseApproval,
  requestLoseApproval,
  updateCustomerStatusAction,
  getMyCustomersAction,
  getNotSeenReasonsAction,
  getSellReasonsAction,
  getAllStaffAPPRAISERAction,
} from "@/actions/task-actions";
import { getCarModelsAction } from "@/actions/car-actions";
import { getMeAction } from "@/actions/user-actions";
import { getBuyReasons } from "@/actions/sell-reason-actions";
import dayjs from "@/lib/dayjs";

// --- SUB-COMPONENTS ---
import { FilterBar } from "./FilterBar"; // Copy code FilterBar mình gửi lúc nãy vào file này
import { TaskCard } from "./TaskCard"; // Copy code TaskCard mình gửi lúc nãy vào file này

// --- MODALS ---
import ModalApproveTransaction from "@/components/assigned-tasks/ModalApproveTransaction";
import ModalLoseLead from "@/components/assigned-tasks/ModalLoseLead";
import ModalContactAndLeadCar from "@/components/assigned-tasks/ModalContactAndLeadCar";
import ModalDetailCustomer from "@/components/assigned-tasks/modal-detail/ModalDetailCustomer";
import ModalSelfAddCustomer from "@/components/assigned-tasks/ModalSelfAddCustomer";
import { UrgencyType } from "@prisma/client";

const { Title, Text } = Typography;
interface MetaData {
  inventory: any[];
  carModels: any[];
  currentUser: any;
  notSeenReasons: any[];
  sellReasons: any[];
  buyReasons: any[];
  staffs: any[];
  loseReasons: any[];
}
export default function AssignedTasksPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("TASKS");

  // --- DATA STATES ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [reasons, setReasons] = useState<any[]>([]);
  const [metaData, setMetaData] = useState<MetaData>({
    inventory: [],
    carModels: [],
    currentUser: null,
    notSeenReasons: [],
    sellReasons: [],
    buyReasons: [],
    staffs: [],
    loseReasons: [],
  });

  // --- FILTER STATES (Tách riêng 2 bộ lọc) ---
  const [taskFilters, setTaskFilters] = useState({
    searchText: "",
    inspectStatus: "ALL",
    dateRange: null,
    subType: "ALL", // ALL, HOT, LATE
    urgencyLevel: "ALL", // Dùng cho HOT / WARM / COOL
  });

  const [custFilters, setCustFilters] = useState({
    searchText: "",
    licensePlate: "",
    inspectStatus: "",
    dateRange: null,
  });

  // --- MODAL VISIBILITY ---
  const [modals, setModals] = useState({
    detail: false,
    contact: false,
    approve: false,
    lose: false,
    add: false,
  });

  // --- LOAD DATA FUNCTIONS ---
  const loadMetaData = async () => {
    try {
      const [cars, models, user, ns, s, staffs, buy, rea] = await Promise.all([
        getAvailableCars(),
        getCarModelsAction(),
        getMeAction(),
        getNotSeenReasonsAction(),
        getSellReasonsAction(),
        getAllStaffAPPRAISERAction(),
        getBuyReasons(),
        getActiveReasonsAction("LOSE"),
      ]);
      setMetaData((prev) => ({
        ...prev,
        inventory: cars,
        carModels: models,
        currentUser: user.data,
        notSeenReasons: ns,
        sellReasons: s,
        staffs: staffs,
        buyReasons: buy,
      }));
      setReasons(rea);
    } catch (err) {
      messageApi.error("Lỗi tải dữ liệu hệ thống");
    }
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyTasksAction(taskFilters);
      setTasks(data);
    } catch (err) {
      messageApi.error("Không thể tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  }, [taskFilters, messageApi]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyCustomersAction(custFilters);
      setCustomers(data);
    } catch (err) {
      messageApi.error("Không thể tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  }, [custFilters, messageApi]);

  // Khởi tạo
  useEffect(() => {
    loadMetaData();
  }, []);

  // Tự động load khi đổi Tab hoặc bấm Lọc
  useEffect(() => {
    if (activeView === "TASKS") loadTasks();
    else loadCustomers();
  }, [activeView, loadTasks, loadCustomers]);

  // --- ACTIONS HANDLER ---
  const handleAction = (
    type: "DETAIL" | "CALL" | "APPROVE" | "LOSE",
    record: any,
  ) => {
    setSelectedLead(record);
    switch (type) {
      case "DETAIL":
        setModals((prev) => ({ ...prev, detail: true }));
        break;
      case "APPROVE":
        setModals((prev) => ({ ...prev, approve: true }));
        break;
      case "LOSE":
        getActiveReasonsAction("LOSE").then((reasons) => {
          setMetaData((prev) => ({ ...prev, loseReasons: reasons }));
          setModals((prev) => ({ ...prev, lose: true }));
        });
        break;
      case "CALL":
        const phone = record.customer?.phone || record.phone;
        const ext = metaData.currentUser?.extension || "";
        window.location.href = `tel:${ext}${phone}`;
        setModals((prev) => ({ ...prev, contact: true }));
        break;
    }
  };

  // --- FINISH LOGICS (Dành cho Modals) ---
  const refreshData = () =>
    activeView === "TASKS" ? loadTasks() : loadCustomers();

  return (
    <div className="min-h-screen bg-[#f4f7fe] p-4 md:p-8">
      {contextHolder}
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* HEADER SECTION */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-200">
              <TeamOutlined className="text-2xl" />
            </div>
            <div>
              <Title
                level={3}
                className="m-0! font-black uppercase tracking-tight text-slate-800"
              >
                Quản lý Nhiệm vụ
              </Title>
              <Text
                type="secondary"
                className="text-[11px] font-bold uppercase tracking-widest text-blue-500"
              >
                Toyota Binh Duong / Lead Management
              </Text>
            </div>
          </div>
          <Button
            type="primary"
            danger
            icon={<UserAddOutlined />}
            className="rounded-2xl h-12 font-black px-8 shadow-lg hover:scale-105 transition-transform"
            onClick={() => setModals((p) => ({ ...p, add: true }))}
          >
            THÊM KHÁCH HÀNG
          </Button>
        </div>

        {/* CONTENT TABS */}
        <Card className="shadow-xl rounded-[2.5rem] border-none overflow-hidden bg-white/80 backdrop-blur-md min-h-[600px]">
          <Tabs
            activeKey={activeView}
            onChange={setActiveView}
            className="px-6 pt-2 custom-modern-tabs"
            items={[
              {
                key: "TASKS",
                label: (
                  <Badge count={tasks.length} offset={[10, 0]} size="small">
                    <span className="font-bold px-2 py-3 inline-block uppercase text-[12px]">
                      Lịch hẹn
                    </span>
                  </Badge>
                ),
                children: (
                  <div className="py-4">
                    <FilterBar
                      type="TASKS"
                      filters={taskFilters}
                      setFilters={setTaskFilters}
                      onSearch={loadTasks}
                      loading={loading}
                    />
                    <div className="mb-6 flex justify-between items-center bg-slate-100/50 p-2 rounded-2xl">
                      <Text className="text-slate-400 italic text-xs ml-2">
                        Đang hiển thị nhiệm vụ cần xử lý
                      </Text>

                      <Segmented
                        options={[
                          { label: "TẤT CẢ", value: "ALL" },
                          { label: "🔥 HOT", value: "HOT" },
                          { label: "☀️ WARM", value: "WARM" },
                          { label: "❄️ COOL", value: "COOL" },
                        ]}
                        value={
                          taskFilters.subType === "LATE"
                            ? "LATE"
                            : taskFilters.urgencyLevel
                        }
                        onChange={(v) => {
                          if (v === "LATE") {
                            setTaskFilters({
                              ...taskFilters,
                              subType: "LATE",
                              urgencyLevel: "ALL",
                            });
                          } else {
                            setTaskFilters({
                              ...taskFilters,
                              subType: "ALL",
                              urgencyLevel: v as any,
                            });
                          }
                        }}
                      />
                    </div>
                    {loading ? (
                      <Skeleton active avatar paragraph={{ rows: 3 }} />
                    ) : tasks.length > 0 ? (
                      tasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          item={t}
                          isTask
                          onAction={handleAction}
                        />
                      ))
                    ) : (
                      <Empty
                        description="Hôm nay bạn không có lịch hẹn nào"
                        className="py-20"
                      />
                    )}
                  </div>
                ),
              },
              {
                key: "CUSTOMERS",
                label: (
                  <span className="font-bold px-2 py-3 inline-block uppercase text-[12px]">
                    Khách hàng của tôi
                  </span>
                ),
                children: (
                  <div className="py-4">
                    <FilterBar
                      type="CUSTOMERS"
                      filters={custFilters}
                      setFilters={setCustFilters}
                      onSearch={loadCustomers}
                      loading={loading}
                    />
                    {loading ? (
                      <Skeleton active avatar paragraph={{ rows: 3 }} />
                    ) : customers.length > 0 ? (
                      customers.map((c) => (
                        <TaskCard key={c.id} item={c} onAction={handleAction} />
                      ))
                    ) : (
                      <Empty
                        description="Không tìm thấy khách hàng nào trong danh sách"
                        className="py-20"
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* --- MODALS SECTION --- */}
      {/* 1. Modal Chi tiết */}
      <ModalDetailCustomer
        isOpen={modals.detail}
        onClose={() => setModals((p) => ({ ...p, detail: false }))}
        selectedLead={selectedLead}
        carModels={metaData.carModels}
        notSeenReasons={metaData.notSeenReasons}
        sellReasons={metaData.sellReasons}
        buyReasons={metaData.buyReasons}
        users={metaData.staffs}
        onUpdateSuccess={refreshData}
        onContactClick={() => {
          setModals((p) => ({ ...p, detail: false, contact: true }));
        }}
      />

      {/* 2. Modal Liên hệ (Gọi điện) */}
      <ModalContactAndLeadCar
        isOpen={modals.contact}
        onClose={() => setModals((p) => ({ ...p, contact: false }))}
        selectedLead={selectedLead}
        loading={loading} // Truyền loading vào đây
        onFinish={async (values) => {
          const res = await updateCustomerStatusAction(
            selectedLead?.customerId ||
              selectedLead?.id ||
              selectedLead?.customer?.id,
            "CONTACTED",
            values.note,
            selectedLead?.id || selectedLead?.customer?.id,
            values.nextContactAt
              ? dayjs(values.nextContactAt).toISOString()
              : null,
            { nextNote: values.nextContactNote },
            values.urgencyLevel,
          );
          if (res.success) {
            messageApi.success("Cập nhật thành công");
            setModals((p) => ({ ...p, contact: false }));
            refreshData();
          }
        }}
      />

      {/* 3. Modal Chốt Giao Dịch - Fix lỗi thiếu 'loading' */}
      <ModalApproveTransaction
        isOpen={modals.approve}
        onClose={() => setModals((p) => ({ ...p, approve: false }))}
        inventory={metaData.inventory}
        carModels={metaData.carModels}
        selectedLead={selectedLead}
        loading={loading} // Gán loading từ state của page vào
        onFinish={async (v) => {
          const res = await requestPurchaseApproval(
            selectedLead.customer?.id || selectedLead.id,
            v,
          );
          if (res.success) {
            messageApi.success("Đã gửi yêu cầu phê duyệt");
            setModals((p) => ({ ...p, approve: false }));
            refreshData();
          }
        }}
      />

      {/* 4. Modal Báo Thất Bại - Fix lỗi thiếu 'loading' và 'onStatusChange' */}
      <ModalLoseLead
        isOpen={modals.lose}
        onClose={() => setModals((p) => ({ ...p, lose: false }))}
        reasons={reasons}
        selectedLead={selectedLead}
        loading={loading} // Truyền loading vào
        onStatusChange={(val) => getActiveReasonsAction(val).then(setReasons)}
        onFinish={async (v) => {
          const res = await requestLoseApproval(
            selectedLead.customer?.id || selectedLead.id,
            v.reasonId,
            v.note,
            v.status,
          );
          if (res.success) {
            messageApi.success("Đã gửi yêu cầu thành công");
            setModals((p) => ({ ...p, lose: false }));
            refreshData();
          }
        }}
      />

      {/* 5. Modal Tự thêm khách */}
      <ModalSelfAddCustomer
        isOpen={modals.add}
        onClose={() => setModals((p) => ({ ...p, add: false }))}
        carModels={metaData.carModels}
        onSuccess={loadCustomers}
      />
      {/* CSS Custom */}
      <style jsx global>{`
        .custom-modern-tabs .ant-tabs-nav::before {
          border-bottom: none !important;
        }
        .ant-tabs-ink-bar {
          background: #2563eb !important;
          height: 4px !important;
          border-radius: 4px;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #2563eb !important;
        }
        .custom-select .ant-select-selector {
          border-radius: 0.75rem !important;
          height: 44px !important;
          display: flex;
          align-items: center;
          border: none !important;
          background: white !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}
