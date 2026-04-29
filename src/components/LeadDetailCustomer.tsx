/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  Modal,
  Button,
  Badge,
  Avatar,
  Typography,
  Tag,
  Tabs,
  Card,
  Timeline,
  Empty,
  Popconfirm,
  Descriptions,
  Divider,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CarOutlined,
  DeleteOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
  ToolOutlined,
  ShareAltOutlined,
  ShopOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import { getLeadStatusHelper } from "@/lib/status-helper";
import { translateSource } from "@/utils/excel-helper";
import { UrgencyBadge } from "@/lib/urgencyBadge";

const { Text, Title } = Typography;

export default function LeadDetailModal({
  open,
  lead,
  onCancel,
  onDelete,
}: any) {
  if (!lead) return null;
  const { label, icon, color } = getLeadStatusHelper(lead.status);
  const isSell = lead.type === "SELL";
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
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
      centered
      closeIcon={
        <CloseOutlined className="text-white opacity-60 hover:opacity-100" />
      }
      styles={{ body: { padding: 0, backgroundColor: "#f1f5f9" } }}
      className="premium-lead-modal"
    >
      {/* HEADER SECTION */}
      <div
        className={`p-8 bg-gradient-to-r ${isSell ? "from-slate-900 via-blue-950" : "from-slate-900 via-indigo-950"} to-black text-white relative`}
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-6 items-center">
            <Badge
              offset={[-10, 90]}
              count={
                lead.isCertified ? (
                  <Tooltip title="Đã chứng nhận">
                    <SafetyCertificateOutlined className="text-yellow-400 text-2xl" />
                  </Tooltip>
                ) : null
              }
            >
              <Avatar
                size={100}
                className="border-4 border-white/10 shadow-2xl bg-slate-800"
                icon={<UserOutlined />}
              />
            </Badge>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Title
                  level={2}
                  className="m-0! text-white! font-bold tracking-tight uppercase"
                >
                  {lead.fullName}
                </Title>
                <UrgencyBadge type={lead.urgencyLevel} />
                {getReferralTypeTag(lead.type)}
              </div>
              <div className="flex flex-wrap gap-4 text-slate-300">
                <span className="flex items-center gap-2 text-lg">
                  <PhoneOutlined className="text-blue-400" />{" "}
                  <b>{lead.phone}</b>
                </span>
                <span className="flex items-center gap-2">
                  <EnvironmentOutlined className="text-red-400" />{" "}
                  {lead.province || "Chưa xác định"}
                </span>
                <span className="flex items-center gap-2 px-3 py-0.5 bg-white/10 rounded-full text-xs border border-white/10">
                  ID: {lead.id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Tag
              color={color}
              icon={icon}
              className="m-0 px-4 py-1 rounded-full border-none font-black text-sm uppercase shadow-lg"
            >
              {label}
            </Tag>
            <Text className="text-slate-200! text-xs">
              Cập nhật: {dayjs(lead.updatedAt).format("DD/MM/YYYY HH:mm")}
            </Text>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-12 gap-6">
        {/* LEFT COLUMN: Lead Information */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Tabs
            type="card"
            className="premium-tabs-style"
            items={[
              {
                key: "1",
                label: (
                  <span className="px-4 font-bold">
                    <CarOutlined /> CHI TIẾT XE
                  </span>
                ),
                children: (
                  <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                      <Title level={4} className="m-0! text-slate-800">
                        Thông số kỹ thuật
                      </Title>
                      {lead.licensePlate && (
                        <div className="px-4 py-1 bg-slate-100 border-2 border-slate-200 rounded-lg font-mono font-bold text-lg tracking-widest">
                          {lead.licensePlate}
                        </div>
                      )}
                    </div>

                    <Descriptions
                      bordered
                      column={2}
                      size="small"
                      className="bg-white"
                    >
                      <Descriptions.Item label="Dòng xe" span={2}>
                        <Text strong className="text-blue-700 text-base">
                          {lead.carModel?.name}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Năm sản xuất">
                        {lead.leadCar?.year || "---"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Hộp số">
                        {lead.leadCar?.transmission === "AUTOMATIC"
                          ? "Số tự động"
                          : "Số sàn"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Nhiên liệu">
                        {lead.leadCar?.fuelType === "GASOLINE" ? "Xăng" : "Dầu"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Chỗ ngồi">
                        {lead.leadCar?.seats} chỗ
                      </Descriptions.Item>
                      <Descriptions.Item label="Nguồn gốc">
                        {lead.leadCar?.origin === "VN"
                          ? "Trong nước"
                          : "Nhập khẩu"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Hình thức">
                        {lead.leadCar?.ownerType === "PERSONAL"
                          ? "Cá nhân"
                          : "Công ty"}
                      </Descriptions.Item>

                      <Descriptions.Item
                        label={isSell ? "Giá kỳ vọng bán" : "Ngân sách mua"}
                        span={2}
                      >
                        <div className="flex items-center gap-2">
                          <DollarCircleOutlined className="text-green-600 text-xl" />
                          <Text strong className="text-2xl text-green-600">
                            {lead.expectedPrice || lead.budget ? (
                              <>
                                {Number(
                                  lead.expectedPrice || lead.budget,
                                ).toLocaleString("vi-VN")}
                                <span className="text-sm ml-1">VNĐ</span>
                              </>
                            ) : (
                              "Thỏa thuận"
                            )}
                          </Text>
                        </div>
                      </Descriptions.Item>
                    </Descriptions>

                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold uppercase text-[11px]">
                        <InfoCircleOutlined /> Ghi chú từ hệ thống
                      </div>
                      <Text className="text-slate-600 italic leading-relaxed">
                        {lead.note ||
                          "Không có ghi chú chi tiết cho khách hàng này."}
                      </Text>
                    </div>
                  </Card>
                ),
              },
              {
                key: "2",
                label: (
                  <span className="px-4 font-bold">
                    <HistoryOutlined /> LỊCH SỬ CHĂM SÓC
                  </span>
                ),
                children: (
                  <Card className="rounded-3xl border-none shadow-sm h-[450px] overflow-y-auto">
                    {lead.activities?.length > 0 ? (
                      <Timeline
                        mode="left"
                        className="mt-4"
                        items={lead.activities.map((act: any) => ({
                          label: (
                            <Text className="text-[11px] font-bold text-slate-400">
                              {dayjs(act.createdAt).format("DD/MM HH:mm")}
                            </Text>
                          ),
                          children: (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <Tag
                                  color="blue"
                                  className="rounded-md font-bold uppercase text-[10px] border-none"
                                >
                                  {act.status}
                                </Tag>
                                <Text className="text-[10px] text-slate-400 font-medium italic">
                                  {act.user?.fullName}
                                </Text>
                              </div>
                              <Text className="text-slate-700 font-medium leading-snug">
                                {act.note}
                              </Text>
                            </div>
                          ),
                        }))}
                      />
                    ) : (
                      <Empty
                        description="Chưa có hoạt động nào được ghi lại"
                        className="py-20"
                      />
                    )}
                  </Card>
                ),
              },
            ]}
          />
        </div>

        {/* RIGHT COLUMN: Management & Operations */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* ASSIGNED PERSONNEL */}
          <Card className="rounded-3xl border-none shadow-sm bg-blue-600 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AuditOutlined style={{ fontSize: "60px" }} />
            </div>
            <div className="relative z-10">
              <Text className="text-[10px] font-black uppercase text-blue-200 block mb-4 tracking-widest">
                Nhân viên phụ trách
              </Text>
              <div className="flex items-center gap-4">
                <Avatar
                  size={54}
                  className="bg-white text-blue-600 font-black text-xl shadow-lg"
                >
                  {lead.assignedTo?.fullName?.charAt(0)}
                </Avatar>
                <div>
                  <Text strong className="text-slate-900! text-base block">
                    {lead.assignedTo?.fullName}
                  </Text>
                  <Text className="text-blue-100 flex items-center gap-1 text-xs">
                    <PhoneOutlined size={10} /> {lead.assignedTo?.phone}
                  </Text>
                </div>
              </div>
              <Divider className="my-4 border-blue-500/50" />
              <div className="flex items-center gap-2 text-xs">
                <ShopOutlined className="text-blue-200" />
                <span className="text-blue-400! font-medium">
                  {lead.branch?.name}
                </span>
              </div>
            </div>
          </Card>

          {/* REFERRER INFO */}
          <Card className="rounded-3xl border-none shadow-sm bg-white mt-4!">
            <Text className="text-[10px] font-black uppercase text-slate-400 block mb-4 tracking-widest">
              Thông tin nguồn & giới thiệu
            </Text>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                <ShareAltOutlined size={20} />
              </div>
              <div>
                <Text strong className="block text-slate-800">
                  {lead.referrer?.fullName}
                </Text>
                <Tag className="m-0 text-[10px] font-bold bg-amber-100 text-amber-700 border-none uppercase">
                  {lead.referrer?.role}
                </Tag>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-xl">
                <Text className="text-[10px] text-slate-400 block uppercase font-bold">
                  Nguồn Lead
                </Text>
                <Text className="text-xs font-bold text-slate-700">
                  {translateSource(lead.source)}
                </Text>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl">
                <Text className="text-[10px] text-slate-400 block uppercase font-bold">
                  Ngày nhận
                </Text>
                <Text className="text-xs font-bold text-slate-700">
                  {dayjs(lead.referralDate).format("DD/MM/YYYY")}
                </Text>
              </div>
            </div>
          </Card>

          {/* INSPECTION STATUS (Only for SELL/TRADE) */}
          {isSell && (
            <Card className="rounded-3xl border-none shadow-sm bg-slate-800 text-white">
              <div className="flex justify-between items-center mb-2">
                <Text className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Trạng thái giám định
                </Text>
                <ToolOutlined className="text-slate-500" />
              </div>
              <Tag
                color={
                  lead.inspectStatus === "NOT_INSPECTED" ? "default" : "success"
                }
                className="rounded-md font-bold uppercase w-full text-center py-1 border-none bg-slate-700 text-slate-300"
              >
                {lead.inspectStatus === "NOT_INSPECTED"
                  ? "Chưa giám định"
                  : "Đã hoàn tất"}
              </Tag>
            </Card>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex gap-2">
              {onDelete && (
                <Popconfirm
                  title="Xóa hồ sơ khách hàng?"
                  onConfirm={() => onDelete(lead.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    className="flex-1 h-12 rounded-xl font-bold border-none bg-red-50 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <DeleteOutlined /> XÓA HỒ SƠ
                  </Button>
                </Popconfirm>
              )}

              <Button
                className="flex-1 h-12 rounded-xl font-bold bg-white border-slate-200"
                onClick={onCancel}
              >
                QUAY LẠI
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
