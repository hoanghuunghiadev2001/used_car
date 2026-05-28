/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Divider,
  Card,
  Space,
  Image,
  Typography,
  Button,
  Tag,
  Empty,
  DatePicker,
  Switch,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  DollarOutlined,
  SafetyOutlined,
  CameraOutlined,
  FileTextOutlined,
  PictureOutlined,
  FilePdfOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getDisplayImageUrl } from "@/utils/googleDrive";

const { Text } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedActivity: any;
  carModels: any[];
  loading: boolean;
  onApprove: (updatedData: any) => void;
  onReject: (reason: string) => void;
}

export default function ModalApprovalDetail({
  isOpen,
  onClose,
  selectedActivity,
  carModels,
  loading,
  onApprove,
  onReject,
}: Props) {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 🔥 Watcher để hiển thị ảnh ngay lập tức khi Form được set giá trị
  const carImagesWatcher = Form.useWatch("carImages", form);
  const documentsWatcher = Form.useWatch("documents", form);

  const conditionOptions = [
    "Mức 5: Xuất sắc: gần như mới",
    "Mức 4: Rất tốt: Có thể trưng bày ngay",
    "Mức 3: Bình thường",
    "Mức 2: Cần phải sửa chữa",
    "Mức 1: Cần phải sửa chửa nhiều",
  ];

  useEffect(() => {
    console.log(selectedActivity);

    if (isOpen) setIsSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedActivity) {
      const customer = selectedActivity.customer || {};
      const leadCar = customer.leadCar || {};

      form.setFieldsValue({
        // Thông tin xe cơ bản
        carModelId: customer.carModelId,
        licensePlate: customer.licensePlate,
        year: customer.carYear ? parseInt(customer.carYear) : undefined,
        odo: leadCar.odo || 0,

        // Hình ảnh và tài liệu (Lấy trực tiếp từ mảng)
        carImages: customer.carImages || [],
        documents: customer.documents || [],

        // Đánh giá chất lượng
        conditionGrade: leadCar.conditionGrade || "",
        isCertified: leadCar.isCertified || false,
        certificationNote: leadCar.certificationNote || "",
        hasFine: leadCar.hasFine || false,
        fineNote: leadCar.fineNote || "",
        finalPrice: leadCar.finalPrice,
        engineNumber: leadCar.engineNumber,
        transmission: leadCar.transmission,
        interiorColor: leadCar.interiorColor,
        color: leadCar.color,
        origin: leadCar.origin,
        seats: leadCar.seats,
        fuelType: leadCar.fuelType,
        contractNo: leadCar.contractNo,
        authorizedOwnerName: leadCar.authorizedOwnerName,
        // Nhân viên giám định
        inspectorName: customer.inspectorRef?.fullName || "",
        inspectorId: customer.inspectorId,
        vin: leadCar.vin,
        // Thông tin khác
        note: customer.note || "",
        // Các trường này trong data mẫu đang để trống, bạn có thể bổ sung nếu cần
        features: leadCar.description || "",
        driveTrain: leadCar.driveTrain,
        carType: leadCar.carType,
        engineSize: leadCar.engineSize,
        ownerType: leadCar.ownerType,
        insuranceDeadline: leadCar.insuranceDeadline
          ? dayjs(leadCar.insuranceDeadline)
          : null,
        insuranceVCDeadline: leadCar.insuranceVCDeadline
          ? dayjs(leadCar.insuranceVCDeadline)
          : null,
        insuranceTNDSDeadline: leadCar.insuranceTNDSDeadline
          ? dayjs(leadCar.insuranceTNDSDeadline)
          : null,
        registrationDeadline: leadCar.registrationDeadline
          ? dayjs(leadCar.registrationDeadline)
          : null,
      });
    } else {
      form.resetFields();
    }
  }, [isOpen, selectedActivity, form]);

  const handleApprove = async () => {
    if (isSubmitting || loading) return;
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      const formattedData = {
        ...values,
        registrationDeadline: values.registrationDeadline?.toISOString(),
        insuranceDeadline: values.insuranceDeadline?.toISOString(),
        insuranceTNDSDeadline: values.insuranceTNDSDeadline?.toISOString(),
        insuranceVCDeadline: values.insuranceVCDeadline?.toISOString(),
      };
      onApprove(formattedData);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    if (isSubmitting || loading) return;
    const reason = form.getFieldValue("adminNote");
    if (!reason) return onReject("");
    setIsSubmitting(true);
    onReject(reason);
  };

  const parsedNote = React.useMemo(() => {
    const noteStr = selectedActivity?.note || "";
    if (!noteStr) return {};

    // Kiểm tra xem có thực sự là JSON không trước khi parse
    if (noteStr.trim().startsWith("{") || noteStr.trim().startsWith("[")) {
      try {
        return JSON.parse(noteStr);
      } catch (e) {
        return { rawNote: noteStr };
      }
    }
    return { rawNote: noteStr };
  }, [selectedActivity?.note]);

  // Kiểm tra images an toàn hơn
  const images = parsedNote?.carData?.images || [];
  const isLoading = loading || isSubmitting;
  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined className="text-green-600" />
          <span className="text-base font-bold uppercase">
            Phê duyệt & Chỉnh sửa hồ sơ
          </span>
        </Space>
      }
      open={isOpen}
      onCancel={isLoading ? undefined : onClose}
      width={1200}
      centered
      maskClosable={false}
      closable={!isLoading}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose} disabled={isLoading}>
          Hủy
        </Button>,
        <Button
          key="reject"
          danger
          icon={<CloseCircleOutlined />}
          onClick={handleReject}
          loading={isLoading}
        >
          Từ chối
        </Button>,
        <Button
          key="approve"
          type="primary"
          className="bg-green-600"
          icon={<CheckCircleOutlined />}
          onClick={handleApprove}
          loading={isLoading}
        >
          Duyệt & Nhập kho
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" disabled={isLoading}>
        <Form.Item name="carImages" noStyle />
        <Form.Item name="documents" noStyle />
        <div className="max-h-[75vh] overflow-y-auto px-1 custom-scrollbar overflow-x-hidden">
          <Row gutter={[24, 0]}>
            {/* --- CỘT TRÁI: THÔNG SỐ KỸ THUẬT & HÌNH ẢNH (2/3 chiều rộng trên desktop) --- */}
            <Col xs={24} lg={16}>
              <Card
                size="small"
                title={
                  <Space>
                    <CarOutlined /> THÔNG SỐ KỸ THUẬT XE
                  </Space>
                }
                className="mb-4 shadow-sm border-slate-200"
              >
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="carModelId"
                      label="Dòng xe (Model)"
                      rules={[{ required: true }]}
                    >
                      <Select
                        showSearch
                        options={carModels.map((m) => ({
                          label: m.name,
                          value: m.id,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="licensePlate" label="Biển số">
                      <Input className="uppercase font-medium" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="year"
                      label="Năm SX"
                      rules={[{ required: true }]}
                    >
                      <InputNumber className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="vin" label="Số khung (VIN)">
                      <Input className="uppercase font-mono" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="engineNumber" label="Số máy">
                      <Input className="uppercase font-mono" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="odo"
                      label="Số Km (ODO)"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        className="w-full!"
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="transmission" label="Hộp số">
                      <Select
                        options={[
                          { label: "Tự động", value: "AUTOMATIC" },
                          { label: "Số sàn", value: "MANUAL" },
                          { label: "CVT", value: "CVT" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="fuelType" label="Nhiên liệu">
                      <Select
                        options={[
                          { label: "Xăng", value: "GASOLINE" },
                          { label: "Dầu", value: "DIESEL" },
                          { label: "Hybrid", value: "HYBRID" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="seats" label="Số chỗ">
                      <InputNumber className="w-full!" />
                    </Form.Item>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Item name="origin" label="Xuất xứ">
                      <Select
                        options={[
                          { label: "Trong nước", value: "VN" },
                          { label: "Nhập khẩu", value: "ORTHER" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="color" label="Màu ngoại thất">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="interiorColor" label="Màu nội thất">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="engineSize" label="Dung tích">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="carType" label="Kiểu dáng">
                      <Select
                        options={[
                          { value: "SEDAN", label: "Sedan" },
                          { value: "HATCHBACK", label: "Hatchback" },

                          { value: "SUV", label: "SUV" },
                          { value: "PICKUP", label: "Bán tải" },
                          { value: "MPV", label: "MPV" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="driveTrain" label="Hệ dẫn động">
                      <Select
                        options={[
                          { value: "FWD", label: "Cầu trước" },
                          { value: "RWD", label: "Cầu sau" },
                          { value: "AWD", label: "4 bánh toàn thời gian" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* ✅ PHẦN HIỂN THỊ HÌNH ẢNH & TÀI LIỆU (MỚI) */}
              <Card
                size="small"
                title={
                  <Space>
                    <CameraOutlined /> HÌNH ẢNH & HỒ SƠ GIÁM ĐỊNH
                  </Space>
                }
                className="mb-4 shadow-sm border-indigo-100"
              >
                <Row gutter={[16, 16]}>
                  {/* Ảnh xe thực tế */}
                  <Col span={24} xl={14}>
                    <Text strong className="block mb-2 text-slate-600">
                      <PictureOutlined className="mr-2" /> ẢNH XE CHI TIẾT
                    </Text>
                    <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300 min-h-[160px]">
                      {carImagesWatcher && carImagesWatcher.length > 0 ? (
                        <Image.PreviewGroup>
                          <div className="grid grid-cols-4 gap-2">
                            {carImagesWatcher.map((img: string, i: number) => (
                              <Image
                                key={i}
                                src={getDisplayImageUrl(img)}
                                height={80}
                                className="rounded-lg object-cover border-2 border-white shadow-sm hover:scale-105 transition-transform"
                              />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Không có ảnh xe"
                        />
                      )}
                    </div>
                  </Col>

                  {/* Tài liệu pháp lý */}
                  <Col span={24} xl={10}>
                    <Text strong className="block mb-2 text-slate-600">
                      <FilePdfOutlined className="mr-2" /> HỒ SƠ / TÀI LIỆU
                    </Text>
                    <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300 min-h-[160px]">
                      {documentsWatcher && documentsWatcher.length > 0 ? (
                        <Image.PreviewGroup>
                          <Space wrap size={8}>
                            {documentsWatcher.map((doc: string, i: number) => (
                              <div
                                key={i}
                                className="flex flex-col items-center"
                              >
                                <Image
                                  src={getDisplayImageUrl(doc)}
                                  width={70}
                                  height={70}
                                  className="rounded border shadow-sm"
                                />
                                <Text className="text-[10px] mt-1 text-slate-400">
                                  Hồ sơ {i + 1}
                                </Text>
                              </div>
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="Không có tài liệu"
                        />
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card
                size="small"
                title={
                  <Space>
                    <SafetyOutlined /> THỜI HẠN PHÁP LÝ & BẢO HIỂM
                  </Space>
                }
                className="mb-4 shadow-sm"
              >
                <Row gutter={12}>
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="registrationDeadline"
                      label="Hạn đăng kiểm"
                    >
                      <DatePicker
                        classNames={{
                          popup: {
                            root: "mobile-center-picker", // Thay cho dropdownClassName
                          },
                        }}
                        className="w-full"
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="insuranceTNDSDeadline" label="Hạn BHDS">
                      <DatePicker
                        classNames={{
                          popup: {
                            root: "mobile-center-picker", // Thay cho dropdownClassName
                          },
                        }}
                        className="w-full"
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="insuranceVCDeadline" label="Hạn BHVC">
                      <DatePicker
                        classNames={{
                          popup: {
                            root: "mobile-center-picker", // Thay cho dropdownClassName
                          },
                        }}
                        className="w-full"
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item
                      name="insuranceDeadline"
                      label="Thời hạn bảo hành"
                    >
                      <DatePicker
                        classNames={{
                          popup: {
                            root: "mobile-center-picker", // Thay cho dropdownClassName
                          },
                        }}
                        className="w-full"
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="ownerType" label="Hình thức sở hữu">
                      <Select
                        options={[
                          { label: "Chính chủ", value: "PERSONAL" },
                          { label: "Ủy quyền L1", value: "AUTHORIZATION_L1" },
                          { label: "Ủy quyền L2", value: "AUTHORIZATION_L2" },
                          { label: "Công ty", value: "COMPANY_VAT" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* --- CỘT PHẢI: TÀI CHÍNH & NỘI DUNG CMS (1/3 chiều rộng trên desktop) --- */}
            <Col xs={24} lg={8}>
              <Card
                size="small"
                title={
                  <Space>
                    <DollarOutlined /> TÀI CHÍNH & GIAO DỊCH
                  </Space>
                }
                className="mb-4 border-red-100 bg-red-50/20 shadow-sm"
              >
                <Form.Item
                  name="finalPrice"
                  label={
                    <Text strong className="text-red-600">
                      Giá chốt nhập cuối cùng (VNĐ)
                    </Text>
                  }
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    className="w-full!"
                    size="large"
                    addonAfter="vnd"
                    formatter={(v) =>
                      `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    style={{ fontSize: "18px", fontWeight: "bold" }}
                  />
                </Form.Item>

                <Form.Item
                  name="contractNo"
                  label="Số hợp đồng"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="HĐ-..." />
                </Form.Item>
                <Form.Item
                  name="authorizedOwnerName"
                  label="Người đứng ủy quyền/hóa đơn"
                >
                  <Input />
                </Form.Item>
              </Card>
              <Card
                size="small"
                title={
                  <Space>
                    <SafetyCertificateOutlined className="text-blue-600" /> THẨM
                    ĐỊNH & CHẤT LƯỢNG
                  </Space>
                }
                className="mb-4 bg-blue-50/30 border-blue-100"
              >
                <Row gutter={12}>
                  <Col span={24}>
                    <Form.Item
                      name="inspectorName"
                      label="Nhân viên giám định thực hiện"
                      className="mb-2"
                    >
                      {/* Hiển thị dạng Text Read-only */}
                      <Input
                        readOnly
                        variant="borderless"
                        className="font-bold text-blue-700 p-0 text-base"
                      />
                    </Form.Item>
                    <Divider className="my-2" />
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="isCertified"
                      label="Chứng nhận T-Sure"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="ĐẠT" unCheckedChildren="KO" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="hasFine"
                      label="Phạt nguội"
                      valuePropName="checked"
                    >
                      <Switch
                        checkedChildren="CÓ LỖI"
                        unCheckedChildren="SẠCH"
                      />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item
                      name="certificationNote"
                      label="Ghi chú đánh giá chất lượng"
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder="Nhập đánh giá chi tiết về máy móc, khung gầm..."
                      />
                    </Form.Item>
                  </Col>

                  {/* Hiện ghi chú phạt nguội nếu có lỗi */}
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.hasFine !== curr.hasFine}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue("hasFine") ? (
                        <Col span={24}>
                          <Form.Item
                            name="fineNote"
                            label={
                              <Text type="danger">Chi tiết lỗi phạt nguội</Text>
                            }
                          >
                            <Input
                              placeholder="Mã lỗi, ngày vi phạm..."
                              className="border-red-300"
                            />
                          </Form.Item>
                        </Col>
                      ) : null
                    }
                  </Form.Item>
                </Row>
              </Card>
              <Card
                size="small"
                title={
                  <Space>
                    <FileTextOutlined /> NỘI DUNG CMS & ĐÁNH GIÁ
                  </Space>
                }
                className="mb-4 shadow-sm"
              >
                <Form.Item
                  name="conditionGrade"
                  label="Đánh giá tình trạng (CMS)"
                  rules={[{ required: true }]}
                >
                  <Select
                    placeholder="Chọn mức độ..."
                    options={conditionOptions.map((opt) => ({
                      label: opt,
                      value: opt,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="features" label="Tiện nghi nổi bật">
                  <Input.TextArea
                    rows={2}
                    placeholder="Cửa sổ trời, ghế điện..."
                  />
                </Form.Item>
                <Form.Item name="note" label="Ghi chú hồ sơ giám định">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Card>

              <Card
                size="small"
                title="Ý KIẾN PHÊ DUYỆT (ADMIN)"
                className="bg-blue-50 border-blue-100 shadow-sm"
              >
                <Form.Item
                  name="adminNote"
                  label="Lời nhắn gửi Sales / Lý do từ chối"
                  className="mb-0"
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Nhập hướng dẫn cho nhân viên..."
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </div>
      </Form>
    </Modal>
  );
}
