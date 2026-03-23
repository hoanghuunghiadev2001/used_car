/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect } from "react";
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
  Checkbox,
  Space,
  DatePicker,
  Upload,
  Image,
  Empty,
  Typography,
  Switch,
} from "antd";
import {
  FilePdfOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "@/lib/dayjs";
import DocumentViewer from "../DocumentViewerProps";
const { Text } = Typography;

interface ModalApproveTransactionProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: (values: any) => void;
  loading: boolean;
  selectedLead: any;
  inventory: any[]; // Xe có sẵn trong kho (cho trường hợp BÁN)
  carModels: any[]; // Danh sách dòng xe (cho trường hợp THU)
}

export default function ModalApproveTransaction({
  isOpen,
  onClose,
  onFinish,
  loading,
  selectedLead,
  inventory,
  carModels,
}: ModalApproveTransactionProps) {
  const [form] = Form.useForm();

  // 🔥 Quan trọng: Watcher để theo dõi giá trị ảnh và tài liệu trong Form
  const carImagesWatcher = Form.useWatch("carImages", form);
  const documentsWatcher = Form.useWatch("documents", form);
  const isCertified = Form.useWatch("isCertified", form);

  const conditionOptions = [
    "Mức 5: Xuất sắc: gần như mới",
    "Mức 4: Rất tốt: Có thể trưng bày ngay",
    "Mức 3: Bình thường",
    "Mức 2: Cần phải sửa chữa",
    "Mức 1: Cần phải sửa chửa nhiều",
  ];

  // Hàm xử lý trước khi gửi dữ liệu lên Server
  const handleSubmit = (values: any) => {
    // Trích xuất lại mảng string URL từ FileList trước khi gửi lên server
    const carImageUrls =
      values.carImages
        ?.map((f: any) => f.url || f.response?.secure_url)
        .filter(Boolean) || [];
    const documentUrls =
      values.documents
        ?.map((f: any) => f.url || f.response?.secure_url)
        .filter(Boolean) || [];
    // Tách biệt dữ liệu xe và dữ liệu hợp đồng
    const payload = {
      carData: {
        carModelId: values.carModelId,
        modelName: carModels.find((m) => m.id === values.carModelId)?.name,
        licensePlate: values.licensePlate,
        year: values.year ? Number(values.year) : null,
        vin: values.vin,
        engineNumber: values.engineNumber,
        odo: values.odo,
        transmission: values.transmission,
        seats: values.seats,
        fuelType: values.fuelType,
        origin: values.origin,
        color: values.color,
        interiorColor: values.interiorColor,
        engineSize: values.engineSize,
        carType: values.carType,
        driveTrain: values.driveTrain,
        ownerType: values.ownerType,
        description: values.description,
        features: values.features,

        conditionGrade: values.conditionGrade,
        isCertified: values.isCertified,
        certificationNote: values.certificationNote,
        tSurePrice: values.tSurePrice,
        carImages: carImageUrls,
        documents: documentUrls,
        // Xử lý Date
        registrationDeadline:
          values.registrationDeadline?.toISOString() || null,
        insuranceDeadline: values.insuranceDeadline?.toISOString() || null,
        insuranceVCDeadline: values.insuranceVCDeadline?.toISOString() || null,
        insuranceTNDSDeadline:
          values.insuranceTNDSDeadline?.toISOString() || null,
      },
      contractData: {
        contractNo: values.contractNo,
        price: values.tSurePrice,
        note: values.contractNote,
        authorizedOwnerName: values.authorizedOwnerName,
      },
    };

    onFinish(payload);
  };
  const mapUrlsToFiles = (urls: any) => {
    if (!urls || !Array.isArray(urls)) return [];
    return urls.map((url, index) => ({
      uid: `${index}`, // ID duy nhất cho mỗi file
      name: `File-${index + 1}`, // Tên hiển thị
      status: "done", // Trạng thái đã hoàn thành
      url: url, // Đường dẫn ảnh
      thumbUrl: url, // Ảnh thu nhỏ
    }));
  };
  // Thêm useEffect vào trong ModalApproveTransaction
  useEffect(() => {
    if (isOpen) {
      const customer = selectedLead.customer || selectedLead; // Linh hoạt cho cả 2 nguồn

      const leadCar = customer.leadCar;

      // Map dữ liệu từ leadCar vào các field của Form
      form.setFieldsValue({
        // Thông tin xe
        carModelId: leadCar?.carModelId || customer.carModelId,
        licensePlate: leadCar?.licensePlate,
        year: leadCar?.year,
        vin: leadCar?.vin,
        engineNumber: leadCar?.engineNumber,
        odo: leadCar?.odo,
        transmission: leadCar?.transmission || "AUTOMATIC",
        fuelType: leadCar?.fuelType || "GASOLINE",
        carType: leadCar?.carType || "SUV",
        seats: leadCar?.seats || 5,
        origin: leadCar?.origin || "VN",
        color: leadCar?.color,
        interiorColor: leadCar?.interiorColor,
        engineSize: leadCar?.engineSize,
        ownerType: leadCar?.ownerType,
        tSurePrice: leadCar?.tSurePrice,

        conditionGrade: leadCar?.conditionGrade,
        isCertified: leadCar?.isCertified ?? false, // Mặc định false nếu null
        certificationNote: leadCar?.certificationNote,

        // Cập nhật ảnh và tài liệu vào Form
        carImages: mapUrlsToFiles(customer.carImages || leadCar?.images),
        documents: mapUrlsToFiles(customer.documents),

        registrationDeadline: leadCar?.registrationDeadline
          ? dayjs(leadCar.registrationDeadline)
          : null,
        insuranceVCDeadline: leadCar?.insuranceVCDeadline
          ? dayjs(leadCar.insuranceVCDeadline)
          : null,
        insuranceTNDSDeadline: leadCar?.insuranceTNDSDeadline
          ? dayjs(leadCar.insuranceTNDSDeadline)
          : null,
        insuranceDeadline: leadCar?.insuranceDeadline
          ? dayjs(leadCar.insuranceDeadline)
          : null,
        // Thông tin giao dịch (Pre-fill giá mong muốn vào giá thực tế để sale sửa)
        actualPrice: leadCar?.expectedPrice || customer.expectedPrice,
      });
    } else if (!isOpen) {
      form.resetFields(); // Xóa trắng form khi đóng modal
    }
  }, [isOpen, selectedLead, form]);

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined className="text-indigo-600" />
          <span className="font-bold uppercase">
            {selectedLead?.type === "BUY"
              ? "PHÊ DUYỆT BÁN XE"
              : "HỒ SƠ THU MUA MỚI"}
          </span>
        </Space>
      }
      open={isOpen}
      onOk={() => form.submit()}
      onCancel={onClose}
      width={1000}
      okText="Gửi yêu cầu phê duyệt"
      confirmLoading={loading}
      centered
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          transmission: "AUTOMATIC",
          fuelType: "GASOLINE",
          carType: "SUV",
          seats: 5,
          driveTrain: "FWD",
          origin: "VN",
        }}
        className="mt-4"
      >
        <Form.Item name="carImages" noStyle />
        <Form.Item name="documents" noStyle />
        {selectedLead?.type === "BUY" ? (
          <Form.Item
            name="carId"
            label={
              <span className="font-bold text-indigo-700">
                Chọn xe từ kho để bán
              </span>
            }
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder="Tìm xe theo tên hoặc biển số..."
              options={inventory.map((c: any) => ({
                label: `🚗 ${c.modelName} [${
                  c.licensePlate || "Chưa biển"
                }] - ${Number(c.sellingPrice).toLocaleString()}đ`,
                value: c.id,
              }))}
            />
          </Form.Item>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
            {/* THÔNG TIN XE (DÀNH CHO THU MUA) */}
            <Card
              size="small"
              title="1. Thông tin định danh & Kỹ thuật"
              className="mb-4 bg-slate-50"
            >
              <Row gutter={16}>
                {/* --- BỔ SUNG: NGƯỜI ĐỨNG ỦY QUYỀN --- */}
                <Col xs={24} md={12}>
                  <Form.Item
                    name="authorizedOwnerName"
                    label="Người đứng ủy quyền"
                    tooltip="Tên cá nhân hoặc pháp nhân đứng tên trên hợp đồng ủy quyền/hóa đơn"
                  >
                    <Input
                      prefix={<UserOutlined className="text-gray-400" />}
                      placeholder="Nhập họ tên người đứng ủy quyền"
                    />
                  </Form.Item>
                </Col>
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
                  <Form.Item
                    name="licensePlate"
                    label="Biển số"
                    getValueFromEvent={
                      (e) =>
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 9) // ✅ CHẶN TỐI ĐA 9 KÝ TỰ
                    }
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập biển số",
                      },
                      {
                        min: 5,
                        message: "Biển số không hợp lệ",
                      },
                      {
                        max: 9,
                        message: "Biển số tối đa 9 ký tự",
                      },
                    ]}
                  >
                    <Input className="uppercase" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="year"
                    label="Năm SX"
                    rules={[{ required: true }]}
                  >
                    <InputNumber className="w-full!" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="vin"
                    label="Số khung (VIN)"
                    rules={[{ required: true }]}
                  >
                    <Input className="uppercase" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="engineNumber"
                    label="Số máy"
                    rules={[{ required: true }]}
                  >
                    <Input className="uppercase" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="odo"
                    label="Số Km (ODO)"
                    rules={[{ required: true }]}
                  >
                    <InputNumber className="w-full!" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="transmission"
                    label="Hộp số"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={[
                        { label: "Tự động", value: "AUTOMATIC" },
                        { label: "Số sàn", value: "MANUAL" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="seats"
                    label="Số chỗ ngồi"
                    rules={[{ required: true }]}
                  >
                    <InputNumber className="w-full!" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="fuelType"
                    label="Nhiên liệu"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={[
                        { value: "GASOLINE", label: "Xăng" },
                        { value: "DIESEL", label: "Dầu" },
                        { value: "HYBRID", label: "Hybrid" },
                        { value: "ELECTRIC", label: "Điện" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="origin"
                    label="Xuất xứ"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Select.Option value="VN">Lắp ráp</Select.Option>
                      <Select.Option value="OTHER">Nhập khẩu</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="color"
                    label="Màu ngoại thất"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="interiorColor"
                    label="Màu nội thất"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="engineSize"
                    label="Dung tích"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="carType"
                    label="Kiểu dáng"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn kiểu dáng">
                      <Select.Option value="SEDAN">Sedan</Select.Option>
                      <Select.Option value="SUV">SUV</Select.Option>
                      <Select.Option value="HATCHBACK">Hatchback</Select.Option>
                      <Select.Option value="PICKUP">
                        Bán tải (Pickup)
                      </Select.Option>
                      <Select.Option value="MPV">MPV (Đa dụng)</Select.Option>
                      <Select.Option value="COUPE">Coupe</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="driveTrain"
                    label="Hệ dẫn động"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="Chọn hệ dẫn động">
                      <Select.Option value="FWD">Cầu trước (FWD)</Select.Option>
                      <Select.Option value="RWD">Cầu sau (RWD)</Select.Option>
                      <Select.Option value="AWD">
                        4 bánh toàn thời gian (AWD)
                      </Select.Option>
                      <Select.Option value="4WD">2 cầu (4WD)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="ownerType"
                    label="Hình thức sở hữu"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={[
                        { label: "Chính chủ", value: "PERSONAL" },
                        { label: "Ủy quyền lần 1", value: "AUTHORIZATION_L1" },
                        { label: "Ủy quyền lần 2", value: "AUTHORIZATION_L2" },

                        {
                          label: "Công ty / Xuất hóa đơn",
                          value: "COMPANY_VAT",
                        },
                      ]}
                    />
                  </Form.Item>
                </Col>
                {/* --- BỔ SUNG CÁC TRƯỜNG THỜI HẠN --- */}
                <Col xs={12} md={6}>
                  <Form.Item
                    name="registrationDeadline"
                    label="Thời hạn đăng kiểm"
                  >
                    <DatePicker
                      classNames={{
                        popup: {
                          root: "mobile-center-picker", // Thay cho dropdownClassName
                        },
                      }}
                      className="w-full!"
                      placeholder="Chọn ngày"
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item name="insuranceVCDeadline" label="Thời hạn BHVC">
                    <DatePicker
                      classNames={{
                        popup: {
                          root: "mobile-center-picker", // Thay cho dropdownClassName
                        },
                      }}
                      className="w-full!"
                      placeholder="Chọn ngày"
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="insuranceTNDSDeadline"
                    label="Thời hạn BHDS"
                    rules={[{ required: true }]}
                  >
                    <DatePicker
                      classNames={{
                        popup: {
                          root: "mobile-center-picker", // Thay cho dropdownClassName
                        },
                      }}
                      className="w-full!"
                      placeholder="Chọn ngày"
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="insuranceDeadline"
                    label="Thời gian bảo hành"
                  >
                    <DatePicker
                      classNames={{
                        popup: {
                          root: "mobile-center-picker", // Thay cho dropdownClassName
                        },
                      }}
                      className="w-full!"
                      placeholder="Đến ngày"
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
            {/* 2. HÌNH ẢNH & HỒ SƠ ĐÃ TẢI LÊN */}
            <Card
              size="small"
              title="2. Hình ảnh & Hồ sơ đã tải lên"
              className="mb-4 border-indigo-100 shadow-sm"
            >
              <Row gutter={[24, 24]}>
                <Col span={24} lg={12}>
                  <Text strong className="block mb-3 text-slate-600">
                    <PictureOutlined className="mr-2" /> ẢNH XE THỰC TẾ
                  </Text>
                  <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 min-h-[160px] flex items-center justify-center">
                    {/* Kiểm tra mảng có tồn tại và có phần tử không */}
                    {carImagesWatcher && carImagesWatcher.length > 0 ? (
                      <Image.PreviewGroup>
                        <div className="grid grid-cols-3 gap-3 w-full">
                          {carImagesWatcher.map((file: any, index: number) => (
                            <Image
                              key={index}
                              width="100%"
                              height={100}
                              className="rounded-lg object-cover shadow-sm border-2 border-white hover:scale-105 transition-transform"
                              src={file.url}
                              fallback="/img/no-image.png"
                            />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có ảnh"
                      />
                    )}
                  </div>
                </Col>
                <Col span={24} lg={12}>
                  <Text strong className="block mb-3 text-slate-600">
                    <FilePdfOutlined className="mr-2" /> TÀI LIỆU PHÁP LÝ
                  </Text>

                  <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 min-h-[160px] flex items-center justify-center">
                    <DocumentViewer files={documentsWatcher} />
                  </div>
                </Col>
              </Row>
            </Card>
            <Card
              size="small"
              title="2. Nội dung hiển thị & Đánh giá (CMS)"
              className="mb-4 mt-2!"
            >
              <Row gutter={16}>
                {/* 1. ĐÁNH GIÁ TÌNH TRẠNG */}
                <Col xs={24} md={12}>
                  <Form.Item
                    name="conditionGrade"
                    label="Phân loại tình trạng"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng chọn tình trạng xe",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Chọn mức độ (A/B/C hoặc 1-5*)"
                      allowClear
                    >
                      {conditionOptions.map((item) => (
                        <Select.Option key={item} value={item}>
                          {item}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  {/* Sử dụng shouldUpdate để Switch không làm lag form */}
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                      prev.isCertified !== curr.isCertified
                    }
                  >
                    {({ getFieldValue }) => (
                      <Form.Item
                        name="isCertified"
                        label="Chứng nhận xe đạt chuẩn?"
                        valuePropName="checked"
                      >
                        <Switch
                          checkedChildren="ĐẠT CHUẨN"
                          unCheckedChildren="KHÔNG ĐẠT"
                          className={
                            getFieldValue("isCertified")
                              ? "bg-green-600"
                              : "bg-red-500"
                          }
                        />
                      </Form.Item>
                    )}
                  </Form.Item>
                </Col>

                {/* 3. GHI CHÚ CHỨNG NHẬN (Hiện ra khi cần lưu ý) */}
                <Col span={24}>
                  <Form.Item
                    name="certificationNote"
                    label="Ghi chú chứng nhận / Lý do không đạt chuẩn"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="VD: Xe đạt chuẩn T-Sure Gold / Hoặc: Xe lỗi khung gầm không cấp chứng nhận..."
                    />
                  </Form.Item>
                </Col>

                {/* 4. PHỤ KIỆN */}
                <Col span={24}>
                  <Form.Item
                    name="features"
                    label="Phụ kiện / Option đi kèm"
                    rules={[
                      { required: true, message: "Vui lòng nhập phụ kiện" },
                    ]}
                  >
                    <Input placeholder="VD: Màn hình Android, Camera 360, Dán phim cách nhiệt..." />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </div>
        )}

        <Divider orientation="horizontal">
          3. Thông tin giao dịch & Pháp lý
        </Divider>
        <Row gutter={16}>
          <Col xs={12} md={8}>
            <Form.Item name="contractNo" label="Số hợp đồng">
              <Input placeholder="HĐ-2024/..." />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              name="tSurePrice"
              label="Giá trị giao dịch"
              rules={[{ required: true }]}
            >
              <InputNumber
                className="w-full!"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                addonAfter="VNĐ"
              />
            </Form.Item>
          </Col>

          {/* Thêm trường Ghi chú hợp đồng */}
          <Col xs={24}>
            <Form.Item
              name="contractNote"
              label="Ghi chú hợp đồng"
              tooltip="Nhập các thỏa thuận riêng hoặc quà tặng kèm theo"
            >
              <Input.TextArea
                rows={3}
                placeholder="Ví dụ: Tặng gói bảo hiểm thân vỏ, bọc vô lăng, giảm giá 5 triệu tiền mặt..."
                showCount
                maxLength={500}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
