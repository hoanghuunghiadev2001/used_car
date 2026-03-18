/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Row, Col, Tag, Divider, Typography } from "antd";
import {
  PhoneOutlined,
  CalendarOutlined,
  MessageOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  CarOutlined,
  InfoCircleOutlined,
  UserSwitchOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { getReferralTypeTagStaff } from "@/lib/status-helper";
import { UrgencyBadge } from "@/lib/urgencyBadge";
import { translateSource } from "@/utils/excel-helper";

const { Text, Title } = Typography;

export const CustomerBanner = ({ customerData, renderTime }: any) => {
  // Helper gán màu sắc và label cho trạng thái giám địnhlog

  const getInspectStatusTag = (status: string) => {
    switch (status) {
      case "INSPECTED":
        return (
          <Tag
            color="#52c41a"
            className="m-0 border-none px-3 rounded-full font-bold shadow-sm shadow-green-200"
          >
            ĐÃ XEM XE
          </Tag>
        );
      case "APPOINTED":
        return (
          <Tag
            color="#faad14"
            className="m-0 border-none px-3 rounded-full font-bold shadow-sm shadow-orange-200"
          >
            HẸN XEM XE
          </Tag>
        );
      case "NOT_INSPECTED":
        return (
          <Tag
            color="#ff4d4f"
            className="m-0 border-none px-3 rounded-full font-bold shadow-sm shadow-red-200"
          >
            CHƯA XEM XE
          </Tag>
        );
      default:
        return (
          <Tag className="m-0 px-3 rounded-full font-bold uppercase">
            KĐ ĐỊNH
          </Tag>
        );
    }
  };

  return (
    <div className="mb-6 p-6 md:p-8 bg-[#0f172a] rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden border border-slate-800 transition-all shadow-indigo-500/10">
      {/* Hiệu ứng nền decor */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full -mr-24 -mt-24 blur-[80px]"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full -ml-20 -mb-20 blur-[60px]"></div>

      <Row
        gutter={[32, 24]}
        align="top"
        className="relative z-10 justify-between"
      >
        {/* CỘT 1: THÔNG TIN KHÁCH HÀNG & ĐỊA CHỈ */}
        <Col xs={24} md={9} lg={9}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                <span className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                  {customerData.fullName}
                </span>
                <UrgencyBadge type={customerData?.urgencyLevel} />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                  <a
                    href={`tel:${customerData.phone}`}
                    className="flex items-center gap-2 text-indigo-300 font-bold hover:text-indigo-200 text-lg leading-none"
                  >
                    <PhoneOutlined className="text-sm" />
                    <span>{customerData.phone}</span>
                  </a>
                  <Divider
                    type="vertical"
                    className="bg-slate-700 h-4 hidden sm:block"
                  />
                  {getReferralTypeTagStaff(customerData.type)}
                </div>

                {/* PHẦN ĐỊA CHỈ: Hiển thị Tỉnh thành và Địa chỉ chi tiết */}
                {(customerData.province || customerData.address) && (
                  <div className="flex flex-col gap-1.5 py-1">
                    {customerData.province && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-400">
                        <GlobalOutlined className="text-xs" />
                        <span className="text-xs uppercase font-black tracking-widest leading-none">
                          {customerData.province}
                        </span>
                      </div>
                    )}
                    {customerData.address && (
                      <div className="flex items-start justify-center sm:justify-start gap-2">
                        <EnvironmentOutlined className="text-slate-500 text-xs mt-1 shrink-0" />
                        <Text className="text-slate-400! text-[13px] leading-snug font-medium italic">
                          {customerData.address}
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                {/* THÔNG TIN NGUỒN GIỚI THIỆU */}
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl inline-block w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start text-indigo-400">
                    <UserSwitchOutlined className="text-xs" />
                    <span className="text-[9px] uppercase font-black tracking-[0.1em]">
                      Nguồn giới thiệu - {translateSource(customerData.source)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 justify-center sm:justify-start text-xs">
                    <span className="text-slate-200 font-bold">
                      {customerData.referrer?.fullName || "Hệ thống"}
                    </span>
                    {customerData.referrer?.phone && (
                      <span className="text-slate-400 font-mono hidden sm:inline">
                        •
                      </span>
                    )}
                    <span className="text-slate-400 font-mono">
                      {customerData.referrer?.phone}
                    </span>
                  </div>
                </div>

                {/* THÔNG TIN XE QUAN TÂM */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 font-medium">
                    <CarOutlined className="text-indigo-400" />
                    <span>{customerData.carModel?.name || "KĐ"}</span>
                    <Tag
                      color="default"
                      className="bg-slate-800 border-slate-700 text-slate-300 font-mono m-0 ml-1 h-5 flex items-center text-[10px]"
                    >
                      {customerData.licensePlate || "---"}
                    </Tag>
                  </div>
                  {customerData?.tradeInModel?.name && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 text-xs">
                      <CarOutlined className="text-indigo-500/50" />
                      <span>
                        Xe muốn đổi:{" "}
                        <span className="text-slate-300 font-bold">
                          {customerData.tradeInModel?.name}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* LÝ DO BÁN (Chỉ hiện khi chưa xem xe) */}
                {customerData.type !== "BUY" &&
                  customerData.inspectStatus === "NOT_INSPECTED" && (
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                      <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <InfoCircleOutlined className="text-[10px]" />
                        <span className="text-[9px] uppercase font-black tracking-widest">
                          Lý do bán xe:
                        </span>
                      </div>
                      <span className="text-[12px] text-indigo-200! leading-relaxed font-medium">
                        {customerData?.sellReason?.name ||
                          "Chưa ghi nhận lý do"}
                      </span>
                    </div>
                  )}

                {customerData.type === "BUY" &&
                  customerData.inspectStatus === "NOT_INSPECTED" && (
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                      <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <InfoCircleOutlined className="text-[10px]" />
                        <span className="text-[9px] uppercase font-black tracking-widest">
                          Lý do mua xe:
                        </span>
                      </div>
                      <span className="text-[12px] text-indigo-200! leading-relaxed font-medium">
                        {customerData?.buyReason?.name || "Chưa ghi nhận lý do"}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </Col>

        {/* CỘT 2: CÔNG TÁC GIÁM ĐỊNH (Chỉ hiện cho nghiệp vụ Thu mua/Định giá) */}
        {customerData.type !== "BUY" && (
          <Col
            xs={24}
            md={8}
            lg={8}
            className="border-l border-slate-800/60 px-6"
          >
            <div className="space-y-5">
              <div>
                <Text className="text-[10px] uppercase tracking-[0.2em] text-slate-300! font-black block mb-2">
                  Công tác giám định
                </Text>
                <div className="flex items-center gap-2">
                  {getInspectStatusTag(customerData.inspectStatus)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-[13px]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                    <SafetyOutlined />
                  </div>
                  <div>
                    <Text className="text-slate-300! block text-[10px] uppercase font-bold tracking-wider">
                      Giám định viên
                    </Text>
                    <Text className="font-semibold text-slate-200!">
                      {customerData.inspectorRef?.fullName || "Chưa bàn giao"}
                    </Text>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                    <EnvironmentOutlined />
                  </div>
                  <div>
                    <Text className="text-slate-300! block text-[10px] uppercase font-bold tracking-wider">
                      Địa điểm xem xe
                    </Text>
                    <Text className="font-semibold text-slate-200! italic leading-snug">
                      {customerData.inspectLocation || "Chưa có địa chỉ"}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Nguyên nhân chưa xem được xe */}
              {customerData.inspectStatus === "NOT_INSPECTED" && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 text-red-400 mb-1">
                    <InfoCircleOutlined className="text-[10px]" />
                    <span className="text-[9px] uppercase font-black tracking-widest">
                      Nguyên nhân chưa xem
                    </span>
                  </div>
                  <span className="text-[13px] text-red-200! leading-relaxed font-medium">
                    {customerData?.notSeenReasonRef?.name ||
                      "Chưa ghi nhận lý do"}
                  </span>
                </div>
              )}
            </div>
          </Col>
        )}

        {/* CỘT 3: KẾ HOẠCH TƯƠNG TÁC */}
        <Col xs={24} md={7} lg={7}>
          <div className="space-y-5">
            <div className="flex items-center justify-between md:justify-end gap-3 text-right">
              <div>
                <Text className="text-[10px] uppercase tracking-widest text-slate-300! font-bold block">
                  Liên hệ cuối
                </Text>
                <Text className="text-sm font-mono text-indigo-400! font-bold">
                  {customerData.lastContactAt
                    ? renderTime(customerData.lastContactAt)
                    : "---"}
                </Text>
              </div>
              <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <PhoneOutlined />
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-indigo-600/20 to-blue-600/10 rounded-[2rem] border border-indigo-500/30 backdrop-blur-md relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-black">
                  <CalendarOutlined className="mr-2" /> Hẹn tiếp theo
                </span>
              </div>
              <Title
                level={5}
                className="!text-emerald-400 !m-0 font-mono font-bold tracking-tighter"
              >
                {customerData.nextContactAt
                  ? renderTime(customerData.nextContactAt)
                  : "Chưa đặt hẹn"}
              </Title>

              {customerData.nextContactNote && (
                <div className="mt-3 pt-3 border-t border-indigo-500/20 flex items-start gap-2">
                  <MessageOutlined className="text-indigo-400 text-xs mt-1 shrink-0" />
                  <Text className="text-slate-400! italic text-[12px] leading-snug">
                    {customerData.nextContactNote}
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};
