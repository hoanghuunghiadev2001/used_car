/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Modal,
  Descriptions,
  Tag,
  Typography,
  Alert,
  Space,
  Button,
  Divider,
  Tabs,
  Timeline,
  Empty,
  Avatar,
  Badge,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
  QuestionCircleOutlined,
  UserOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SyncOutlined,
  CarOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import { getLeadStatusHelper } from "@/lib/status-helper";
import TextArea from "antd/es/input/TextArea";

const { Text } = Typography;

interface ModalApproveLoseProps {
  isOpen: boolean;
  onClose: () => void;
  selectedActivity: any;
  loading: boolean;
  onConfirm: (
    id: string,
    decision: "APPROVE" | "REJECT",
    targetStatus?: string,
    note?: string,
  ) => void;
  history?: any[];
  historyLoading?: boolean;
}

export default function ModalApproveLose({
  isOpen,
  onClose,
  selectedActivity,
  loading,
  onConfirm,
  history = [],
  historyLoading = false,
}: ModalApproveLoseProps) {
  const [reasonReject, setReasonReject] = useState<string>(""); // Khởi tạo chuỗi rỗng

  // --- GUARD CLAUSE ---
  if (!selectedActivity || selectedActivity.status !== "PENDING_LOSE_APPROVAL")
    return null;

  const rawNote = selectedActivity.note || "";
  const customer = selectedActivity.customer || {};
  const leadCar = customer.leadCar || {};
  const carModel = customer.carModel || {};

  // --- LOGIC BÓC TÁCH CHUỖI ---
  const targetStatusMatch = rawNote.match(/ĐÍCH:\s*([A-Z_]+)/);
  const targetStatus = targetStatusMatch ? targetStatusMatch[1] : "LOSE";

  const salesNote = rawNote.includes("]: ")
    ? rawNote.split("]: ").pop()?.trim()
    : rawNote;

  const { label, color, icon } = getLeadStatusHelper(targetStatus);

  // --- SUB-RENDERS ---

  // Tab 1: Nội dung yêu cầu
  const renderApprovalDetail = (
    <div className="py-2">
      <Alert
        title={
          <Space>
            <UserOutlined />
            <Text strong>
              Nhân viên đề xuất: {selectedActivity.user?.fullName}
            </Text>
          </Space>
        }
        description={
          <div className="text-xs">
            Yêu cầu được gửi lúc:{" "}
            {dayjs(selectedActivity.createdAt).format("HH:mm DD/MM/YYYY")}
            <br />
            Hệ thống sẽ chuyển khách hàng sang trạng thái <b>{label}</b> nếu bạn
            phê duyệt.
          </div>
        }
        type="warning"
        showIcon
        icon={<InfoCircleFilled />}
        className="mb-5 rounded-xl border-orange-100 bg-orange-50"
      />

      <Descriptions
        bordered
        column={1}
        size="small"
        labelStyle={{
          width: "160px",
          fontWeight: "bold",
          backgroundColor: "#f8fafc",
        }}
      >
        <Descriptions.Item label="Khách hàng">
          <Text strong className="text-blue-600">
            {customer.fullName}
          </Text>
          <div className="text-xs text-gray-400">{customer.phone}</div>
        </Descriptions.Item>
        <Descriptions.Item label="Đề xuất chuyển">
          <Tag
            icon={icon}
            color={color}
            className="rounded-full px-3 font-medium uppercase text-[10px] py-1 m-0"
          >
            {label}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Lý do hệ thống">
          {selectedActivity.reason?.content || "Không xác định"}
        </Descriptions.Item>
      </Descriptions>

      <Divider titlePlacement="left" plain className="my-6!">
        <Text
          type="secondary"
          className="text-[11px] uppercase font-bold text-slate-400"
        >
          Nội dung giải trình từ Sales
        </Text>
      </Divider>

      <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-200 italic text-slate-700 shadow-inner min-h-[80px]">
        {salesNote || "Không có nội dung giải trình chi tiết."}
      </div>

      <Divider titlePlacement="left" plain className="my-6!">
        <Text
          type="secondary"
          className="text-[11px] uppercase font-bold text-slate-400"
        >
          Lý do từ chối
        </Text>
      </Divider>

      <Descriptions.Item label="Lý do từ chối" className="mt-3!">
        <TextArea
          rows={3}
          placeholder="Nhập lý do từ chối nếu có"
          onChange={(e) => setReasonReject(e.target.value)}
        />
      </Descriptions.Item>
    </div>
  );

  // Tab 2: Chi tiết xe (MỚI)
  const renderCarDetail = (
    <div className="py-2">
      <div className="mb-4 flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <CarOutlined className="text-2xl text-indigo-600" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-indigo-400 leading-none mb-1">
            Dòng xe quan tâm
          </div>
          <div className="text-lg font-bold text-indigo-900">
            {carModel.name || "Chưa cập nhật model"}
            <span className="ml-2 text-sm font-normal text-indigo-500">
              ({carModel.grade || "N/A"})
            </span>
          </div>
        </div>
      </div>

      <Descriptions
        bordered
        column={2}
        size="small"
        labelStyle={{
          fontWeight: "bold",
          backgroundColor: "#f8fafc",
          width: "140px",
        }}
      >
        <Descriptions.Item label="Biển số">
          <Tag color="blue" className="font-mono font-bold m-0">
            {leadCar.licensePlate || customer.licensePlate || "N/A"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Năm sản xuất">
          {leadCar.year || customer.carYear || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Số KM (ODO)">
          {leadCar.odo ? `${leadCar.odo.toLocaleString()} km` : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Hộp số">
          {leadCar.transmission === "AUTOMATIC"
            ? "Số tự động"
            : leadCar.transmission || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Nhiên liệu">
          {leadCar.fuelType === "GASOLINE" ? "Xăng" : leadCar.fuelType || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Số chỗ ngồi">
          {leadCar.seats ? `${leadCar.seats} chỗ` : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Nguồn gốc">
          {leadCar.origin === "VN" ? "Trong nước" : leadCar.origin || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Loại sở hữu">
          {leadCar.ownerType === "PERSONAL"
            ? "Cá nhân"
            : leadCar.ownerType || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Giá dự kiến" span={2}>
          <Text strong className="text-red-500">
            {leadCar.expectedPrice
              ? `${leadCar.expectedPrice.toLocaleString()} VNĐ`
              : "Chưa có giá"}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú xe" span={2}>
          <div className="text-slate-600">
            {customer.note || "Không có ghi chú thêm về tình trạng xe."}
          </div>
        </Descriptions.Item>
      </Descriptions>

      {/* Hiển thị các Badge trạng thái pháp lý/bảo hiểm nếu cần */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <Badge
          status={leadCar.isCertified ? "success" : "default"}
          text="Xe T-Sure"
        />
        <Badge
          status={leadCar.hasFine ? "error" : "success"}
          text={leadCar.hasFine ? "Có phạt nguội" : "Không phạt nguội"}
        />
        <Badge
          status={leadCar.insuranceVC ? "success" : "default"}
          text="Bảo hiểm VC"
        />
      </div>
    </div>
  );

  // Tab 3: Dòng thời gian tương tác
  const renderHistoryTimeline = (
    <div className="max-h-[500px] overflow-y-auto px-4 py-6 custom-scrollbar bg-slate-50/50 rounded-2xl">
      {historyLoading ? (
        <div className="py-20 text-center">
          <SyncOutlined spin className="text-3xl text-indigo-500 mb-2" />
          <div className="text-slate-400">Đang truy xuất lịch sử hồ sơ...</div>
        </div>
      ) : history.length > 0 ? (
        <Timeline
          mode="left"
          items={history.map((item) => {
            const statusCfg = getLeadStatusHelper(item.status);
            let dotColor = "#3b82f6";
            if (item.status === "PENDING_LOSE_APPROVAL") dotColor = "#f59e0b";
            if (item.status === "LOSE" || item.status === "CANCELLED")
              dotColor = "#ef4444";
            if (item.status === "DEAL_DONE" || item.status === "FROZEN")
              dotColor = "#10b981";

            return {
              label: (
                <div className="flex flex-col items-end pr-2">
                  <Text strong className="text-[12px] text-slate-700">
                    {dayjs(item.createdAt).format("DD/MM")}
                  </Text>
                  <Text type="secondary" className="text-[10px] font-mono">
                    {dayjs(item.createdAt).format("HH:mm")}
                  </Text>
                </div>
              ),
              dot: (
                <div
                  style={{ background: dotColor }}
                  className="w-2 h-2 rounded-full ring-4 ring-white shadow-sm"
                />
              ),
              children: (
                <div className="mb-6 group">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag
                      color={statusCfg.color}
                      icon={statusCfg.icon}
                      className="text-[10px] font-bold gap-1 items-center m-0 flex! border-none px-2 rounded-md uppercase"
                    >
                      {statusCfg.label}
                    </Tag>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all group-hover:border-indigo-300 group-hover:shadow-md relative">
                    <div className="text-[13px] text-slate-700 leading-relaxed mb-3">
                      {item.note}
                    </div>
                    {item.reason && (
                      <div className="mb-3 p-2 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-2">
                        <InfoCircleFilled className="text-indigo-400 mt-0.5" />
                        <div>
                          <Text className="text-[11px] font-bold text-indigo-600 block uppercase">
                            Lý do hệ thống:
                          </Text>
                          <Text className="text-xs text-indigo-800">
                            {item.reason.content}
                          </Text>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                      <Space size={4}>
                        <Avatar
                          size={18}
                          icon={<UserOutlined />}
                          className="bg-slate-200 text-slate-500"
                        />
                        <Text className="text-[11px] font-semibold text-slate-500">
                          {item.user?.fullName}
                        </Text>
                      </Space>
                    </div>
                  </div>
                </div>
              ),
            };
          })}
        />
      ) : (
        <Empty description="Không có lịch sử tương tác" className="py-20" />
      )}
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <QuestionCircleOutlined className="text-orange-500" />
          <span className="uppercase font-bold tracking-tight text-slate-700">
            Chi tiết phê duyệt & Lịch sử hồ sơ
          </span>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button
          key="close"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg"
        >
          Đóng
        </Button>,
        <Button
          key="reject"
          danger
          icon={<CloseCircleFilled />}
          onClick={() =>
            onConfirm(selectedActivity.id, "REJECT", undefined, reasonReject)
          }
          loading={loading}
          className="rounded-lg"
        >
          Từ chối (Tiếp tục chăm sóc)
        </Button>,
        <Button
          key="approve"
          type="primary"
          className="bg-emerald-600 border-none rounded-lg hover:bg-emerald-700"
          icon={<CheckCircleFilled />}
          onClick={() =>
            onConfirm(
              selectedActivity.id,
              "APPROVE",
              targetStatus,
              reasonReject,
            )
          }
          loading={loading}
        >
          Đồng ý cho {label}
        </Button>,
      ]}
      width={750}
      centered
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey="1"
        className="custom-tabs"
        items={[
          {
            key: "1",
            label: (
              <Space>
                <FileTextOutlined /> Yêu cầu
              </Space>
            ),
            children: renderApprovalDetail,
          },
          {
            key: "car",
            label: (
              <Space>
                <CarOutlined /> Chi tiết xe
              </Space>
            ),
            children: renderCarDetail,
          },
          {
            key: "2",
            label: (
              <Space>
                <HistoryOutlined /> Lịch sử
              </Space>
            ),
            children: renderHistoryTimeline,
          },
        ]}
      />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </Modal>
  );
}
