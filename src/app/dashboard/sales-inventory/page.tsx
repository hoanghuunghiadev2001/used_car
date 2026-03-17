/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Card,
  Typography,
  message,
  Segmented,
  Divider,
  Avatar,
  Input,
  Tabs,
} from "antd";
import {
  DollarOutlined,
  HistoryOutlined,
  UserAddOutlined,
  CarOutlined,
  SearchOutlined,
  TeamOutlined,
  PhoneOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

// Actions
import {
  getMyTasksAction,
  getAvailableCars,
  requestSaleApproval,
  getActiveReasonsAction,
  updateCustomerStatusAction,
  requestLoseApproval,
  completeMaintenanceTaskAction,
  getMaintenanceTasksAction,
  getMyCustomersAction,
  selfCreateCustomerAction,
  getCustomerUrgencyStatsAction,
} from "@/actions/task-actions";
import { getCarModelsAction } from "@/actions/car-actions";
import { getMeAction } from "@/actions/user-actions";
import { getBuyReasons } from "@/actions/sell-reason-actions";
import { getLeadStatusHelper } from "@/lib/status-helper";
import dayjs from "@/lib/dayjs";

// Components
import ModalLoseLead from "@/components/assigned-tasks/ModalLoseLead";
import ModalContactAndLeadCar from "@/components/assigned-tasks/ModalContactAndLeadCar";
import ModalDetailCustomer from "@/components/assigned-tasks/modal-detail/ModalDetailCustomer";
import ModalApproveSales from "@/components/assigned-tasks/ModalApproveSales";
import ModalAddSelfLead from "@/components/assigned-tasks/ModalAddSelfLead";
import { UrgencyBadge } from "@/lib/urgencyBadge";

const { Title, Text } = Typography;

export default function SalesTasksPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState([]);
  const [carModels, setCarModels] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("Tất cả");
  const [searchText, setSearchText] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");
  const [isMobile, setIsMobile] = useState(false);

  // Modal States
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [buyReasons, setBuyReasons] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    HOT: number;
    WARM: number;
    COOL: number;
    UNASSIGNED: number;
  }>({ HOT: 0, WARM: 0, COOL: 0, UNASSIGNED: 0 });
  // --- EFFECT ---
  useEffect(() => {
    loadCustomerUrgencyStatsAction();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    loadInitialData();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync khách hàng khi search hoặc filter urgency thay đổi
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadCustomersOnly(searchText, filterUrgency);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchText, filterUrgency]);

  // --- API CALLS ---
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [leads, cars, models, maintenance, userData, bReasons]: any =
        await Promise.all([
          getMyTasksAction(),
          getAvailableCars(),
          getCarModelsAction(),
          getMaintenanceTasksAction(),
          getMeAction(),
          getBuyReasons(),
        ]);
      setTasks(leads);
      setInventory(cars);
      setCarModels(models);
      setBuyReasons(bReasons);
      setMaintenanceTasks(maintenance);
      setCurrentUser(userData.data);
    } catch (err) {
      messageApi.error("Lỗi tải dữ liệu hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomersOnly = async (search?: string, urgency?: string) => {
    try {
      const myCustomers = await getMyCustomersAction({
        searchText: search,
        urgencyLevel: urgency === "ALL" ? undefined : urgency,
      });
      setCustomers(myCustomers);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomerUrgencyStatsAction = async () => {
    const data = await getCustomerUrgencyStatsAction();

    // Chuyển Object thành Mảng để map() dễ hơn và fix lỗi TS
    const formattedData = [
      { label: "HOT", value: data.HOT, color: "#ef4444" },
      { label: "WARM", value: data.WARM, color: "#f97316" },
      { label: "COOL", value: data.COOL, color: "#3b82f6" },
      { label: "Chưa phân loại", value: data.UNASSIGNED, color: "#9ca3af" },
    ];
    setStats(data);
  };

  // --- LOGIC XỬ LÝ ---
  const handleMakeCall = (customerPhone: string) => {
    if (!customerPhone) return;
    const extension = currentUser?.extension || "";
    window.location.href = `tel:${extension}${customerPhone}`;
    console.log(`tel:${extension}${customerPhone}`);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((i) => {
      const matchSearch =
        i.customer?.fullName
          ?.toLowerCase()
          .includes(searchText.toLowerCase()) ||
        i.customer?.phone?.includes(searchText);
      if (filterType === "Quá hạn") return matchSearch && i.isOverdue;
      return matchSearch;
    });
  }, [tasks, searchText, filterType]);

  // --- ACTIONS ---
  const onFinishAddCustomer = async (values: any) => {
    setLoading(true);
    try {
      const res = await selfCreateCustomerAction(values);
      if (res.success) {
        messageApi.success("Đã thêm khách hàng mới!");
        setIsAddModalOpen(false);
        loadInitialData();
      } else {
        messageApi.error("error" in res ? res.error : "Dữ liệu đã tồn tại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onContactFinish = async (values: any) => {
    setLoading(true);
    try {
      const targetId =
        selectedLead?.customerId ||
        selectedLead?.id ||
        selectedLead?.customer?.id;
      const taskId = selectedLead?.id || selectedLead?.customer?.id;

      const result = await updateCustomerStatusAction(
        targetId,
        "CONTACTED",
        values.note,
        taskId,
        values.nextContactAt ? dayjs(values.nextContactAt).toISOString() : null,
        { nextNote: values.nextContactNote },
      );
      if (result.success) {
        messageApi.success("Cập nhật tương tác thành công");
        setIsContactModalOpen(false);
        loadInitialData();
      }
    } finally {
      setLoading(false);
    }
  };

  const onFailFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await requestLoseApproval(
        selectedLead.id,
        values.reasonId,
        values.note,
        values.status,
      );
      if (res.success) {
        messageApi.success("Đã gửi yêu cầu phê duyệt đóng hồ sơ");
        setIsFailModalOpen(false);
        loadInitialData();
      } else {
        messageApi.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const TableCountdown = ({ deadline, isOverdue, minutesOverdue }: any) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
      const timer = setInterval(() => {
        const diff = dayjs(deadline).diff(dayjs(), "second");
        setTimeLeft(diff);
      }, 1000);
      return () => clearInterval(timer);
    }, [deadline]);

    if (isOverdue || timeLeft <= 0) {
      return (
        <div className="flex flex-col">
          <Text className="text-[12px] font-bold text-red-500">
            {dayjs(deadline).format("HH:mm DD/MM")}
          </Text>
          <Tag
            color="error"
            className="w-fit m-0 text-[10px] font-bold animate-pulse"
          >
            TRỄ {minutesOverdue}m
          </Tag>
        </div>
      );
    }

    const d = Math.floor(timeLeft / (3600 * 24));
    const h = Math.floor((timeLeft % (3600 * 24)) / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;

    // Render logic rút gọn
    const renderTimeText = () => {
      if (d > 0) return `${d}n ${h}h`; // Còn trên 1 ngày: chỉ hiện Ngày & Giờ
      if (h > 0) return `${h}h ${m}p`; // Còn trong ngày: chỉ hiện Giờ & Phút
      return `${m}p ${s}s`; // Dưới 1 giờ: hiện Phút & Giây
    };

    const isUrgent = timeLeft < 900; // Dưới 15 phút

    return (
      <div className="flex flex-col">
        <Text className="text-[11px] text-slate-400">
          Hạn: {dayjs(deadline).format("HH:mm DD/MM")}
        </Text>
        <Text
          className={`text-[12px] font-bold font-mono ${isUrgent ? "text-red-500! animate-pulse" : "text-emerald-600!"}`}
        >
          Còn {renderTimeText()}
        </Text>
      </div>
    );
  };

  const handleCompleteMaintenance = async (taskId: string) => {
    try {
      const res = await completeMaintenanceTaskAction(taskId);
      if (res.success) {
        messageApi.success("Hoàn thành nhắc bảo dưỡng");
        loadInitialData();
      }
    } catch (err) {
      messageApi.error("Lỗi xử lý");
    }
  };

  // --- COLUMNS DEFINITION ---
  const columnsTasks = [
    {
      title: "KHÁCH HÀNG",
      render: (t: any) => (
        <Space>
          <div>
            <Text strong className="block">
              {t.customer.fullName}
            </Text>
            <Text type="secondary" className="text-[11px] font-mono">
              {t.customer.phone}
            </Text>
          </div>
          <UrgencyBadge type={t.customer.urgencyLevel} />
        </Space>
      ),
    },
    {
      title: "XE / NHU CẦU",
      render: (t: any) => (
        <div>
          <Text strong className="text-emerald-700 text-[13px]">
            <CarOutlined /> {t.customer.carModel?.name || "Chưa chọn xe"}
          </Text>
          <div className="text-[11px] text-slate-400 line-clamp-1">
            {t.customer.leadCar?.description || "Nhu cầu chung"}
          </div>
        </div>
      ),
    },
    {
      title: "KPI HẠN",
      render: (t: any) => {
        const isSelfCreated =
          t.customer?.referrerId === currentUser?.id ||
          t.customer?.isSelfCreated;

        // Trường hợp 1: Tự khai thác (Không tính hạn, chỉ hiện giờ hẹn)
        if (isSelfCreated) {
          return (
            <div className="flex flex-col">
              <Tag
                color="blue"
                className="w-fit m-0 text-[10px] font-bold rounded-md border-blue-200 bg-blue-50 text-blue-600"
              >
                TỰ KHAI THÁC
              </Tag>
              <Text className="text-[12px] text-green-400! mt-1 italic">
                Hẹn:{" "}
                {dayjs(t.scheduledAt || t.deadlineAt).format("HH:mm DD/MM")}
              </Text>
            </div>
          );
        }

        // Trường hợp 2: Khách hệ thống (Chạy bộ đếm realtime)
        return (
          <TableCountdown
            deadline={t.deadlineAt}
            isOverdue={t.isOverdue}
            minutesOverdue={t.minutesOverdue}
          />
        );
      },
    },
    {
      title: "XỬ LÝ",
      align: "right" as const,
      render: (record: any) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            icon={<PhoneOutlined />}
            type="primary"
            ghost
            size="small"
            shape="circle"
            onClick={(e) => {
              e.stopPropagation();
              handleMakeCall(record.customer?.phone);
              setSelectedLead(record);
              setIsContactModalOpen(true);
            }}
          />
          <Button
            danger
            icon={<CloseCircleOutlined />}
            type="text"
            onClick={() => {
              setSelectedLead(record.customer);
              setIsFailModalOpen(true);
              getActiveReasonsAction("LOSE").then(setReasons);
            }}
          />
        </Space>
      ),
    },
  ];

  const columnsCustomers = [
    {
      title: "KHÁCH HÀNG",
      render: (r: any) => (
        <Space>
          <Avatar className="bg-slate-800">{r.fullName?.[0]}</Avatar>
          <div>
            <div className="flex gap-2 items-center">
              <Text strong>{r.fullName}</Text>
              <UrgencyBadge type={r.urgencyLevel} />
            </div>
            <div className="text-[11px] font-mono">{r.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "XE / NHU CẦU",
      render: (t: any) => (
        <div>
          <Text strong className="text-emerald-700 text-[13px]">
            <CarOutlined /> {t.carModel?.name || "Chưa chọn xe"}
          </Text>
          <div className="text-[11px] text-slate-400 line-clamp-1">
            {t.leadCar?.description || "Nhu cầu chung"}
          </div>
        </div>
      ),
    },
    {
      title: "TRẠNG THÁI",
      render: (r: any) => {
        const { label, color, icon } = getLeadStatusHelper(r.status);
        return (
          <Tag
            icon={icon}
            color={color}
            className="rounded-full border-none font-black text-[10px] px-3"
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "THAO TÁC",
      align: "right" as const,
      render: (record: any) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            icon={<PhoneOutlined />}
            shape="circle"
            onClick={(e) => {
              e.stopPropagation();
              handleMakeCall(record.phone);
              setSelectedLead(record);
              setIsContactModalOpen(true);
            }}
          />
          <Button
            type="primary"
            className="bg-emerald-600 border-none font-bold rounded-xl"
            onClick={() => {
              setSelectedLead({ customerId: record.id, customer: record });
              setIsSalesModalOpen(true);
            }}
          >
            CHỐT
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            type="text"
            onClick={() => {
              setSelectedLead({ customer: record, id: record.id });
              setIsFailModalOpen(true);
              getActiveReasonsAction("LOSE").then(setReasons);
            }}
          />
        </Space>
      ),
    },
  ];

  const CountdownTimer = ({
    deadline,
    isSelfCreated,
  }: {
    deadline: string;
    isSelfCreated: boolean;
  }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
      if (isSelfCreated) return;
      const timer = setInterval(() => {
        const diff = dayjs(deadline).diff(dayjs(), "second");
        setTimeLeft(diff);
      }, 1000);
      return () => clearInterval(timer);
    }, [deadline, isSelfCreated]);

    if (isSelfCreated) {
      return (
        <div className="flex flex-col items-end">
          <Tag
            color="blue"
            className="m-0 border-none rounded-lg font-bold text-[10px] bg-blue-50 text-blue-600"
          >
            TỰ KHAI THÁC
          </Tag>
          <Text className="text-[10px] text-green-400! mt-1">
            Hẹn: {dayjs(deadline).format("HH:mm DD/MM/YY")}
          </Text>
        </div>
      );
    }

    if (timeLeft <= 0) {
      return (
        <div className="flex flex-col items-end">
          <Text className="text-red-500! font-bold animate-pulse text-[11px]">
            QUÁ HẠN
          </Text>
          <Text className="text-[10px] text-slate-400">
            Hạn: {dayjs(deadline).format("HH:mm")}
          </Text>
        </div>
      );
    }

    // Logic tính toán thông minh
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    const isUrgent = timeLeft < 900; // Nháy đỏ nếu dưới 15 phút

    return (
      <div
        className={`flex flex-col items-end ${isUrgent ? "animate-pulse" : ""}`}
      >
        <Text
          className={`text-[10px] font-mono ${isUrgent ? "text-red-600! font-bold" : "text-slate-500"}`}
        >
          Hạn: {dayjs(deadline).format("HH:mm")}
        </Text>
        <Text
          className={`text-[11px] font-bold ${isUrgent ? "text-red-500!" : "text-emerald-600"}`}
        >
          Còn {hours > 0 ? `${hours}h ` : ""}
          {minutes}p {seconds}s
        </Text>
      </div>
    );
  };

  // --- MOBILE RENDERER ---
  const renderMobileFeed = (items: any[], type: "TASK" | "CUSTOMER") => {
    if (items.length === 0)
      return (
        <Card className="rounded-2xl text-center p-8 border-dashed border-2">
          <Text type="secondary">Trống</Text>
        </Card>
      );

    return items.map((item) => {
      const isTask = type === "TASK";
      const record = isTask ? item : { customer: item, isOverdue: false };

      // Logic xác định khách tự khai thác (không tính hạn)
      const isSelfCreated =
        record.customer?.isSelfCreated ||
        record.customer?.referrerId === currentUser?.id;

      return (
        <Card
          key={item.id}
          className={`mb-3! rounded-2xl shadow-sm border-none transition-all ${
            !isSelfCreated && record.isOverdue
              ? "bg-red-50 ring-1 ring-red-100"
              : "bg-white"
          }`}
          onClick={() => {
            setSelectedLead(isTask ? item : { customer: item });
            setIsDetailModalOpen(true);
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <Space align="start">
                <Avatar
                  size="default"
                  className={isTask ? "bg-emerald-500" : "bg-slate-700"}
                >
                  {record.customer.fullName?.[0]}
                </Avatar>
                <div>
                  <Text strong className="text-[15px] block leading-none mb-1">
                    {record.customer.fullName}
                  </Text>
                  <Text type="secondary" className="text-[11px] font-mono">
                    {record.customer.phone}
                  </Text>
                </div>
              </Space>
              <div>
                <Text strong className="text-[15px] block leading-none mb-1">
                  <CarOutlined />{" "}
                  {record.customer.carModel?.name || "Chưa chọn xe"}
                </Text>
              </div>
            </div>

            {/* Hiển thị đếm ngược hoặc Tag tự khai thác */}
            {isTask && item.scheduledAt ? (
              <CountdownTimer
                deadline={item.deadlineAt}
                isSelfCreated={isSelfCreated}
              />
            ) : (
              <UrgencyBadge type={record.customer.urgencyLevel} />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
            <div className="flex gap-2 items-center">
              {isTask && <UrgencyBadge type={record.customer.urgencyLevel} />}
              {!isTask && isSelfCreated && (
                <Tag
                  color="success"
                  className="m-0 text-[10px] font-bold rounded"
                >
                  TỰ KHAI THÁC
                </Tag>
              )}
              {/* Chỉ hiện tag TRỄ nếu KHÔNG PHẢI khách tự khai thác */}
              {isTask && !isSelfCreated && item.isOverdue && (
                <Tag
                  color="error"
                  className="m-0 text-[10px] font-bold rounded"
                >
                  TRỄ {item.minutesOverdue}m
                </Tag>
              )}

              {/* Icon đánh dấu khách tự khai thác nếu cần thiết ở hàng dưới */}
              {isSelfCreated && (
                <CheckCircleOutlined className="text-blue-500! text-xs" />
              )}
            </div>

            <Space onClick={(e) => e.stopPropagation()}>
              <Button
                size="middle"
                shape="circle"
                className="border-none bg-slate-100"
                icon={<PhoneOutlined className="text-emerald-600" />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMakeCall(record.customer?.phone);
                  setSelectedLead(record);
                  setIsContactModalOpen(true);
                }}
              />
              {!isTask && (
                <Button
                  type="primary"
                  className="bg-emerald-600 border-none font-bold rounded-xl"
                  onClick={() => {
                    setSelectedLead({
                      customerId: record.id,
                      customer: record,
                    });
                    setIsSalesModalOpen(true);
                  }}
                >
                  CHỐT
                </Button>
              )}

              <Button
                size="middle"
                shape="circle"
                className="border-none bg-slate-100"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSelectedLead(isTask ? item : record.customer);
                  setIsFailModalOpen(true);
                }}
              />
            </Space>
          </div>
        </Card>
      );
    });
  };
  return (
    <div className="min-h-screen bg-[#f4f7fe] p-4 md:p-8">
      {contextHolder}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg">
              <DollarOutlined className="text-xl" />
            </div>
            <Title
              level={4}
              className="!m-0 font-black uppercase tracking-tighter"
            >
              Bán hàng
            </Title>
          </div>
          <Button
            type="primary"
            size="large"
            className="bg-emerald-600 font-bold rounded-2xl"
            icon={<UserAddOutlined />}
            onClick={() => setIsAddModalOpen(true)}
          >
            {isMobile ? "" : "THÊM KHÁCH"}
          </Button>
        </div>

        {/* TABS HỆ THỐNG */}
        <Tabs
          defaultActiveKey="1"
          className="custom-sales-tabs"
          items={[
            {
              key: "1",
              label: (
                <span className="px-2">
                  <ThunderboltOutlined /> NHIỆM VỤ & BẢO DƯỠNG
                </span>
              ),
              children: (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* PHẦN NHIỆM VỤ */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <Title
                        level={5}
                        className="m-0! text-slate-400 uppercase text-[11px] tracking-widest"
                      >
                        Danh sách kpi
                      </Title>
                      <Segmented
                        options={["Tất cả", "Quá hạn"]}
                        value={filterType}
                        onChange={(v: any) => setFilterType(v)}
                        className="bg-slate-200/50 p-1 rounded-xl"
                      />
                    </div>
                    {isMobile ? (
                      renderMobileFeed(filteredTasks, "TASK")
                    ) : (
                      <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
                        <Table
                          dataSource={filteredTasks}
                          columns={columnsTasks}
                          rowKey="id"
                          loading={loading}
                          pagination={{ pageSize: 5 }}
                          onRow={(r) => ({
                            onClick: () => {
                              setSelectedLead(r);
                              setIsDetailModalOpen(true);
                            },
                          })}
                        />
                      </Card>
                    )}
                  </div>

                  {/* PHẦN BẢO DƯỠNG */}
                  <div className="space-y-4">
                    <Divider plain>
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        Lịch nhắc bảo dưỡng
                      </Text>
                    </Divider>
                    <Card className="rounded-3xl border-none shadow-lg bg-white/40 overflow-hidden">
                      <Table
                        dataSource={maintenanceTasks}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 5 }}
                        columns={[
                          {
                            title: "KHÁCH HÀNG",
                            render: (t) => (
                              <Text strong className="text-[12px]">
                                {t.customer?.fullName}
                              </Text>
                            ),
                          },
                          {
                            title: "SĐT",
                            render: (t) => (
                              <Text className="text-[12px]">
                                {t.customer?.phone}
                              </Text>
                            ),
                          },
                          {
                            title: "HẠN KPI",
                            render: (t) => (
                              <Text
                                className={`text-[11px] ${dayjs().isAfter(dayjs(t.deadlineAt)) ? "text-red-500 font-bold" : ""}`}
                              >
                                {dayjs(t.deadlineAt).format("DD/MM HH:mm")}
                              </Text>
                            ),
                          },
                          {
                            title: "",
                            align: "right",
                            render: (t) => (
                              <Space>
                                <Button
                                  size="small"
                                  className="text-[10px] rounded-lg"
                                  onClick={() =>
                                    handleMakeCall(t.customer?.phone)
                                  }
                                >
                                  GỌI
                                </Button>
                                <Button
                                  type="primary"
                                  size="small"
                                  className="bg-blue-600 rounded-lg text-[10px]"
                                  onClick={() =>
                                    handleCompleteMaintenance(t.id)
                                  }
                                >
                                  XONG
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </div>
                </div>
              ),
            },
            {
              key: "2",
              label: (
                <span className="px-2">
                  <TeamOutlined /> KHO KHÁCH HÀNG
                </span>
              ),
              children: (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                    <Segmented
                      value={filterUrgency}
                      onChange={(v) => setFilterUrgency(v as string)}
                      className="bg-slate-200/50 p-1 rounded-xl"
                      options={[
                        { label: "Tất cả", value: "ALL" },
                        {
                          label: (
                            <span className="text-red-500 font-bold">
                              HOT ({stats.HOT})
                            </span>
                          ),
                          value: "HOT",
                        },
                        {
                          label: (
                            <span className="text-orange-500 font-bold">
                              WARM ({stats.WARM})
                            </span>
                          ),
                          value: "WARM",
                        },
                        {
                          label: (
                            <span className="text-blue-500 font-bold">
                              COOL ({stats.COOL})
                            </span>
                          ),
                          value: "COOL",
                        },
                        {
                          label: (
                            <span className="text-green-500 font-bold">
                              Chưa xác định ({stats.UNASSIGNED})
                            </span>
                          ),
                          value: "UNDERFINE",
                        },
                      ]}
                    />
                    <Input
                      placeholder="Tìm tên, SĐT..."
                      prefix={<SearchOutlined className="text-slate-400" />}
                      className="rounded-2xl border-none shadow-sm h-11 w-full md:w-64"
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                    />
                  </div>
                  {isMobile ? (
                    renderMobileFeed(customers, "CUSTOMER")
                  ) : (
                    <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white/70 backdrop-blur-sm">
                      <Table
                        dataSource={customers}
                        columns={columnsCustomers}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        onRow={(r) => ({
                          onClick: () => {
                            setSelectedLead({ customer: r });
                            setIsDetailModalOpen(true);
                          },
                        })}
                      />
                    </Card>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* --- CÁC MODALS --- */}
      <ModalApproveSales
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        selectedLead={selectedLead}
        inventory={inventory}
        loading={loading}
        onFinish={async (v: any) => {
          setLoading(true);
          try {
            const res = await requestSaleApproval(
              selectedLead.customer?.id || selectedLead.id,
              v,
              selectedLead.id || selectedLead.customer?.id,
            );
            if (res.success) {
              messageApi.success("Đã gửi phê duyệt!");
              setIsSalesModalOpen(false);
              loadInitialData();
            }
          } finally {
            setLoading(false);
          }
        }}
      />
      <ModalContactAndLeadCar
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        selectedLead={selectedLead}
        onFinish={onContactFinish}
        loading={loading}
      />
      <ModalDetailCustomer
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedLead={selectedLead}
        onUpdateSuccess={loadInitialData}
        carModels={carModels}
        buyReasons={buyReasons}
        UrgencyBadge={UrgencyBadge}
        onContactClick={() => {
          setIsDetailModalOpen(false);
          setIsContactModalOpen(true);
        }}
      />
      <ModalLoseLead
        isOpen={isFailModalOpen}
        onClose={() => setIsFailModalOpen(false)}
        selectedLead={selectedLead}
        loading={loading}
        reasons={reasons}
        onFinish={onFailFinish}
        onStatusChange={(val) => getActiveReasonsAction(val).then(setReasons)}
      />
      <ModalAddSelfLead
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        carModels={carModels}
        currentUser={currentUser}
        loading={loading}
        onFinish={onFinishAddCustomer}
      />

      <style jsx global>{`
        .custom-sales-tabs .ant-tabs-nav {
          background: white;
          padding: 8px;
          border-radius: 20px;
          margin-bottom: 24px !important;
          border: 1px solid #f1f5f9;
        }
        .custom-sales-tabs .ant-tabs-tab-active {
          background: #f0fdf4 !important;
          border-radius: 12px !important;
        }
        .custom-sales-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #059669 !important;
          font-weight: 800 !important;
        }
        .custom-sales-tabs .ant-tabs-ink-bar {
          background: #059669 !important;
        }
        .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-size: 10px !important;
          text-transform: uppercase !important;
          color: #94a3b8 !important;
          font-weight: 800 !important;
          padding: 16px !important;
        }
        .ant-table-row {
          cursor: pointer;
          transition: all 0.2s;
        }
        .ant-table-row:hover {
          background-color: #f1f7ff !important;
        }
      `}</style>
    </div>
  );
}
