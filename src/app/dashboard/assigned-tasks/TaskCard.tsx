/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  Card,
  Row,
  Col,
  Avatar,
  Space,
  Typography,
  Tag,
  Tooltip,
  Button,
  Badge,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  CarOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import { UrgencyBadge } from "@/lib/urgencyBadge";
import { getLeadStatusHelper, getReferralTypeTag } from "@/lib/status-helper";

const { Text } = Typography;

interface TaskCardProps {
  item: any;
  isTask?: boolean;
  onAction: (type: "DETAIL" | "CALL" | "APPROVE" | "LOSE", record: any) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  item,
  isTask,
  onAction,
}) => {
  const customer = isTask ? item.customer : item;

  // Logic tính trễ
  const calculateDelay = () => {
    if (!isTask || !item.scheduledAt) return { isLate: false, lateMinutes: 0 };
    const scheduledTime = dayjs(item.scheduledAt);
    const deadline = scheduledTime.add(30, "minute");
    const isOverdue = dayjs().isAfter(deadline);
    return {
      isLate: isOverdue,
      lateMinutes: isOverdue ? dayjs().diff(deadline, "minute") : 0,
    };
  };

  // 1. Định nghĩa lại Enum (nếu chưa có)
  enum InspectStatus {
    INSPECTED = "INSPECTED",
    NOT_INSPECTED = "NOT_INSPECTED",
    APPOINTED = "APPOINTED",
  }

  // 2. Định nghĩa Interface cho cấu hình
  interface StatusConfig {
    label: string;
    color: string;
    className: string;
  }

  // 3. Ràng buộc Map với Enum
  const INSPECT_STATUS_MAP: Record<InspectStatus, StatusConfig> = {
    [InspectStatus.INSPECTED]: {
      label: "ĐÃ XEM XE",
      color: "green",
      className:
        "bg-green-500/20! border-green-500/30! text-green-700! transition-all hover:scale-105 animate-bounce",
    },
    [InspectStatus.NOT_INSPECTED]: {
      label: "CHƯA XEM XE",
      color: "red",
      className: "bg-red-500/20! border-red-500/30! text-red-700!",
    },
    [InspectStatus.APPOINTED]: {
      label: "HẸN XEM XE",
      color: "orange",
      className: "bg-orange-500/20! border-orange-500/30! text-orange-700!",
    },
  };
  const { isLate, lateMinutes } = calculateDelay();
  const scheduledTime = isTask ? dayjs(item.scheduledAt) : null;
  const createAtTime = !isTask ? dayjs(item.createdAt) : null;
  return (
    <Card
      hoverable
      className={`mb-4! overflow-hidden border-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isLate ? "bg-red-50/30" : "bg-white"}`}
      bodyStyle={{ padding: "16px 20px" }}
      onClick={() => onAction("DETAIL", item)}
    >
      {isLate && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
      )}

      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} sm={10} md={9}>
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <Text
              strong
              className="text-[17px] text-slate-800 leading-none capitalize"
            >
              {createAtTime?.format("DD/MM/YY")}
            </Text>
            <div className="relative">
              <Avatar
                size={56}
                icon={<UserOutlined />}
                className={`${isLate ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"} border-2 border-white shadow-sm`}
              />
              {isLate && (
                <div className="absolute -top-1 -right-1">
                  <Badge count={`!`} style={{ backgroundColor: "#ff4d4f" }} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Space size={8} align="center">
                <Text
                  strong
                  className="text-[17px] text-slate-800 leading-none capitalize"
                >
                  {customer?.fullName?.toLowerCase()}
                </Text>
                <UrgencyBadge type={customer?.urgencyLevel} />
              </Space>
              <div className="flex flex-row  gap-4 items-center ">
                <div className="flex items-center text-slate-500 text-sm font-medium">
                  <PhoneOutlined className="mr-1.5 text-xs" /> {customer?.phone}
                </div>
                <div className="mt-1 flex gap-2">
                  {getReferralTypeTag(customer.type)}
                </div>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={7} md={7} className="border-l border-slate-100 pl-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <CarOutlined className="mr-2 text-blue-500" />
              <Text strong className="text-slate-700 truncate">
                {customer?.carModel?.name || "Chưa xác định"}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag
                color="gold"
                className="m-0 border-none bg-amber-50 text-amber-700 font-semibold rounded"
              >
                {customer?.expectedPrice || "---"}
              </Tag>
              <Tag className="m-0 bg-slate-100 border-none text-slate-600 font-mono text-[10px]">
                {customer?.licensePlate || "---"}
              </Tag>
            </div>
            <div className="flex gap-2 items-center">
              {!isTask && (
                <Tag
                  color={getLeadStatusHelper(customer.status).color}
                  className="rounded-full px-3 border-none w-fit"
                >
                  {getLeadStatusHelper(customer.status).label}
                </Tag>
              )}
              {(() => {
                const statusKey =
                  customer.inspectStatus as keyof typeof INSPECT_STATUS_MAP;

                const statusConfig = INSPECT_STATUS_MAP[statusKey] || {
                  label: "KHÔNG XÁC ĐỊNH",
                  color: "default",
                  className: "bg-gray-500/20 border-gray-500/30 text-gray-300",
                };

                return (
                  <Tag
                    color={statusConfig.color}
                    className={`${statusConfig.className} px-3 uppercase text-[10px] font-bold m-0 rounded-lg`}
                  >
                    {statusConfig.label}
                  </Tag>
                );
              })()}
            </div>
          </div>
        </Col>

        <Col
          xs={24}
          sm={7}
          md={8}
          className="flex flex-col sm:items-end justify-between min-h-[80px]"
        >
          {isTask && (
            <div className="text-right mb-auto">
              <div
                className={`text-[10px] font-bold uppercase ${isLate ? "text-red-500" : "text-emerald-500"}`}
              >
                {isLate ? `Trễ ${lateMinutes} phút` : scheduledTime?.fromNow()}
              </div>
              <div className="flex items-center justify-end text-slate-600 font-semibold mt-0.5">
                <CalendarOutlined className="mr-1.5 text-xs text-slate-400" />{" "}
                {scheduledTime?.format("HH:mm · DD/MM")}
              </div>
            </div>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-2 flex justify-between lg:justify-center gap-4"
          >
            <Tooltip title="Gọi ngay">
              <Button
                shape="circle"
                icon={<PhoneOutlined />}
                className="bg-emerald-50 text-emerald-600 border-none h-10 w-10"
                onClick={() => onAction("CALL", item)}
              />
            </Tooltip>
            <Button
              type="primary"
              className="bg-blue-600 hover:bg-blue-700 rounded-lg px-6 h-10 font-bold"
              onClick={() => {
                console.log(item);

                onAction("APPROVE", item);
              }}
            >
              CHỐT
            </Button>
            <Tooltip title="Thất bại">
              <Button
                danger
                type="text"
                icon={<CloseCircleOutlined className="text-xl" />}
                className="opacity-40 hover:opacity-100"
                onClick={() => onAction("LOSE", item)}
              />
            </Tooltip>
          </div>
        </Col>
      </Row>
    </Card>
  );
};
