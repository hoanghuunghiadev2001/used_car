/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Badge,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Card,
  Typography,
  Button,
  Tag,
  Tooltip,
  Space,
  Select,
} from "antd";
import {
  PlusOutlined,
  HistoryOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import {
  getDailyInbounds,
  upsertDailyInbound,
} from "@/actions/daily-carInbound-actions";

const { Title, Text } = Typography;

export default function CalendarInboundPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDailyInbounds({});
      if (res.success) {
        setData(res.data || []);
      }
    } catch (err) {
      message.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const dataMap = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      const dateStr = dayjs(item.date).format("YYYY-MM-DD");
      map.set(dateStr, item);
    });
    return map;
  }, [data]);

  const onSelectDate = (date: dayjs.Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    const existingData = dataMap.get(dateStr);

    setSelectedDate(date);
    form.setFieldsValue({
      date: date,
      totalCars: existingData ? existingData.totalCars : 0,
      note: existingData ? existingData.note : "",
    });
    setModalVisible(true);
  };

  const onFinish = async (values: any) => {
    const payload = {
      date: values.date.toISOString(),
      totalCars: values.totalCars,
      note: values.note || "",
    };

    const res = await upsertDailyInbound(payload);
    if (res.success) {
      message.success(`Đã cập nhật ngày ${dayjs(values.date).format("DD/MM")}`);
      setModalVisible(false);
      fetchData();
    } else {
      message.error(res.message);
    }
  };

  const dateCellRender = (value: dayjs.Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    const dayData = dataMap.get(dateStr);
    if (!dayData) return null;

    return (
      <div className="mt-1">
        <Tooltip title={dayData.note || "Đã nhập"}>
          <div className="bg-indigo-50 border border-indigo-100 rounded p-1 flex flex-col items-center">
            <span className="text-indigo-600 font-black text-sm">
              {dayData.totalCars}
            </span>
            <span className="text-[9px] text-indigo-400 uppercase leading-none">
              Xe IM
            </span>
          </div>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title
              level={3}
              className="!m-0 uppercase tracking-tighter font-black"
            >
              <CalendarOutlined className="mr-2 text-indigo-600" />
              Lịch nhập khách hàng tiềm năng xe mới (IM)
            </Title>
            <Text type="secondary">Chọn ngày để cập nhật số lượng xe</Text>
          </div>
          <Button
            icon={<HistoryOutlined />}
            onClick={fetchData}
            loading={loading}
            className="rounded-xl font-bold"
          >
            LÀM MỚI
          </Button>
        </div>

        <Card className="shadow-xl rounded-[2rem] border-none overflow-hidden p-2 md:p-4 bg-white">
          <Calendar
            headerRender={({ value, onChange }) => {
              const start = 2020;
              const end = dayjs().year() + 2;
              const monthOptions = [];
              for (let i = 0; i < 12; i++) {
                monthOptions.push(
                  <Select.Option key={i} value={i}>
                    Tháng {i + 1}
                  </Select.Option>,
                );
              }

              const yearOptions = [];
              for (let i = start; i < end; i++) {
                yearOptions.push(
                  <Select.Option key={i} value={i}>
                    {i}
                  </Select.Option>,
                );
              }

              return (
                <div className="flex flex-wrap justify-between p-4 items-center gap-4">
                  <Space size="middle">
                    <Select
                      size="large"
                      className="w-32 font-bold"
                      value={value.month()}
                      onChange={(newMonth) => onChange(value.month(newMonth))}
                    >
                      {monthOptions}
                    </Select>
                    <Select
                      size="large"
                      className="w-28 font-bold"
                      value={value.year()}
                      onChange={(newYear) => onChange(value.year(newYear))}
                    >
                      {yearOptions}
                    </Select>
                  </Space>

                  <Tag
                    color="indigo"
                    className="m-0 rounded-full px-4 py-1 font-black text-base shadow-sm"
                  >
                    TỔNG THÁNG:{" "}
                    {Array.from(dataMap.values())
                      .filter((item) => dayjs(item.date).isSame(value, "month"))
                      .reduce((a, b) => a + b.totalCars, 0)}{" "}
                    khách hàng tiềm năng xe mới
                  </Tag>
                </div>
              );
            }}
            onSelect={onSelectDate}
            cellRender={dateCellRender}
          />
        </Card>

        <div className="mt-4 flex gap-4 justify-center">
          <Space>
            <Badge status="success" /> <Text className="text-xs">Đã nhập</Text>
          </Space>
          <Space>
            <Badge status="default" />{" "}
            <Text className="text-xs">Chưa nhập</Text>
          </Space>
        </div>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined className="text-indigo-600" />
            <span>CẬP NHẬT NGÀY {selectedDate.format("DD/MM/YYYY")}</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
        width={400}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="pt-4"
          initialValues={{ totalCars: 0 }}
        >
          <Form.Item name="date" hidden>
            <Input />
          </Form.Item>
          <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex items-start gap-3">
            <InfoCircleOutlined className="mt-1 text-blue-500" />
            <Text className="text-blue-800 text-sm italic">
              Hệ thống sẽ cộng dồn hoặc ghi đè nếu ngày này đã tồn tại dữ liệu.
            </Text>
          </div>
          <Form.Item
            name="totalCars"
            label={<Text strong>Số lượng xe</Text>}
            rules={[{ required: true, message: "Vui lòng nhập số" }]}
          >
            <InputNumber
              min={0}
              autoFocus
              style={{ width: "100%" }}
              className="h-14 flex items-center text-2xl font-black rounded-xl"
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="note" label={<Text strong>Ghi chú</Text>}>
            <Input.TextArea
              rows={3}
              placeholder="Ghi chú nhanh..."
              className="rounded-xl p-3"
            />
          </Form.Item>
          <div className="flex gap-3 mt-8">
            <Button
              onClick={() => setModalVisible(false)}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              HỦY
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              className="flex-1 h-12 rounded-xl font-bold bg-indigo-600"
            >
              LƯU
            </Button>
          </div>
        </Form>
      </Modal>

      <style jsx global>{`
        .ant-picker-calendar-full .ant-picker-cell-inner {
          height: 100px !important;
        }
        @media (max-width: 768px) {
          .ant-picker-calendar-full .ant-picker-cell-inner {
            height: 60px !important;
          }
        }
        .ant-picker-calendar-date-today {
          border-top: 2px solid #4f46e5 !important;
          background: #f5f3ff !important;
        }
      `}</style>
    </div>
  );
}
