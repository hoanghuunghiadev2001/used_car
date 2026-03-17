/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Tag,
  Button,
  Typography,
  Empty,
  Skeleton,
  Space,
  Badge,
} from "antd";
import {
  SearchOutlined,
  CarOutlined,
  ReloadOutlined,
  FilterOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  getCarModelsAction,
  getInventoryAdvancedAction,
} from "@/actions/car-actions";
import CarDetailModal from "@/components/showroom/CarDetailModal";
import { getEligibleStaffAction } from "@/actions/user-actions";

const { Title, Text } = Typography;

export default function AdvancedShowroomPage() {
  const [cars, setCars] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // States Filter & Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [modelId, setModelId] = useState("ALL");
  // Định nghĩa màu sắc trạng thái chuyên nghiệp
  const statusConfig: any = {
    REFURBISHING: { color: "#faad14", label: "Đang tân trang", bg: "#fffbe6" },
    READY_FOR_SALE: { color: "#52c41a", label: "Sẵn sàng bán", bg: "#f6ffed" },
    BOOKED: { color: "#1890ff", label: "Đã đặt cọc", bg: "#e6f7ff" },
    SOLD: { color: "#f5222d", label: "Đã bán", bg: "#fff1f0" },
  };

  // State Modal
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getCarModelsAction().then(setModels);
    loadInitialData();
  }, [search, status, modelId]);

  const loadInitialData = async () => {
    setLoading(true);
    const res = await getInventoryAdvancedAction({
      page: 1,
      carModelId: modelId,
      status,
      search,
    });
    setCars(res.data);

    setHasMore(res.hasMore ?? false);
    setPage(1);
    setLoading(false);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getInventoryAdvancedAction({
      page: nextPage,
      carModelId: modelId,
      status,
      search,
    });
    setCars((prev) => [...prev, ...res.data]);
    setHasMore(res.hasMore ?? false);
    setPage(nextPage);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* FILTER BAR */}
        <Card className="mb-8! border-none shadow-md rounded-2xl sticky top-4 z-10 overflow-hidden">
          <div className="absolute left-0 top-0 w-1 h-full bg-indigo-600"></div>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} lg={10}>
              <Input
                size="large"
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder="Tìm xe theo tên, biển số hoặc số khung (VIN)..."
                allowClear
                className="rounded-lg"
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={12} lg={5}>
              <Select
                size="large"
                className="w-full"
                placeholder="Dòng xe"
                onChange={setModelId}
                defaultValue="ALL"
                options={[
                  { label: "Tất cả dòng xe", value: "ALL" },
                  // Sử dụng Array.isArray để đảm bảo chắc chắn là mảng trước khi map
                  ...(Array.isArray(models) ? models : []).map((m: any) => ({
                    label: m.name,
                    value: m.id,
                  })),
                ]}
              />
            </Col>
            <Col xs={12} lg={5}>
              <Select
                size="large"
                className="w-full"
                placeholder="Trạng thái"
                onChange={setStatus}
                defaultValue="ALL"
                options={[
                  { label: "Mọi trạng thái", value: "ALL" },
                  { label: "Sẵn sàng bán", value: "READY_FOR_SALE" },
                  { label: "Đang tân trang", value: "REFURBISHING" },
                  { label: "Đã đặt cọc", value: "BOOKED" },
                  { label: "Đã bán", value: "SOLD" },
                ]}
              />
            </Col>
            <Col xs={24} lg={4}>
              <Button
                type="primary"
                size="large"
                block
                icon={<FilterOutlined />}
                onClick={loadInitialData}
                className="bg-indigo-600 hover:!bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200"
              >
                Lọc dữ liệu
              </Button>
            </Col>
          </Row>
        </Card>

        {/* INVENTORY GRID */}
        {loading ? (
          <Row gutter={[24, 24]}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <Card
                  loading
                  className="rounded-2xl"
                  cover={<div className="h-48 bg-slate-200" />}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <>
            <Row gutter={[24, 24]}>
              {cars.map((car) => (
                <Col xs={24} sm={12} lg={6} key={car.id}>
                  <Card
                    hoverable
                    onClick={() => {
                      setSelectedCar(car);
                      setIsModalOpen(true);
                    }}
                    className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col h-full"
                    cover={
                      <div className="relative overflow-hidden h-48">
                        <img
                          alt={car.modelName}
                          src={
                            car.images?.[0] ||
                            "https://placehold.co/600x400?text=No+Image"
                          }
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Tag trạng thái ở góc phải */}
                        <div
                          className="absolute top-3 right-0 px-3 py-1 rounded-l-full font-bold text-xs shadow-md z-10"
                          style={{
                            backgroundColor: statusConfig[car.status]?.bg,
                            color: statusConfig[car.status]?.color,
                            border: `1px solid ${statusConfig[car.status]?.color}40`,
                          }}
                        >
                          {statusConfig[car.status]?.label}
                        </div>

                        {/* MÃ XE (Stock Code) - Hiển thị đè lên ảnh ở góc trái dưới */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] text-white font-mono tracking-wider">
                          #{car.stockCode}
                        </div>
                      </div>
                    }
                  >
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <Title level={5} className="!m-0 truncate flex-1 pr-2">
                          {car.modelName}
                        </Title>
                        <Tag className="m-0 text-[10px] bg-cyan-100! text-orange-400! font-bold border-none rounded">
                          {car.year}
                        </Tag>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl mb-4 flex justify-between items-center">
                        <div className="flex flex-col">
                          <Text
                            type="secondary"
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            Giá niêm yết
                          </Text>
                          <Text className="text-indigo-600! font-bold text-lg">
                            {Number(car.sellingPrice) > 0
                              ? `${Number(car.sellingPrice).toLocaleString()} ₫`
                              : "liên hệ TVBH"}
                          </Text>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                        <div className="flex flex-col items-end">
                          <Text
                            type="secondary"
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            Odo
                          </Text>
                          <Text className="font-semibold text-slate-700!">
                            {car.odo?.toLocaleString()} km
                          </Text>
                        </div>
                      </div>
                    </div>

                    <Button
                      block
                      className="border-none bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      Chi tiết <PlusOutlined className="text-[10px]" />
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
            {/* PAGINATION */}
            {hasMore ? (
              <div className="flex justify-center mt-12">
                <Button
                  size="large"
                  icon={<ReloadOutlined />}
                  loading={loadingMore}
                  onClick={handleLoadMore}
                  className="rounded-full px-12 h-12 flex items-center border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold"
                >
                  TẢI THÊM DỮ LIỆU
                </Button>
              </div>
            ) : (
              cars.length > 0 && (
                <div className="text-center mt-12 opacity-50">
                  <Text italic>Bạn đã xem hết danh sách xe trong kho</Text>
                </div>
              )
            )}
          </>
        )}

        {cars.length === 0 && !loading && (
          <div className="bg-white rounded-3xl p-20 shadow-sm border border-dashed border-slate-200">
            <Empty description="Không tìm thấy phương tiện nào phù hợp với bộ lọc" />
          </div>
        )}

        {/* COMPONENT MODAL */}
        <CarDetailModal
          car={selectedCar}
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          statusConfig={statusConfig}
        />
      </div>
    </div>
  );
}
