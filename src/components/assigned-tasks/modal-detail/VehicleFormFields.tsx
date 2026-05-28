/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import {
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Divider,
  Typography,
  Card,
  Upload,
  Button,
  Switch,
  Space,
  message,
} from "antd";
import {
  CarOutlined,
  DollarOutlined,
  ToolOutlined,
  FileSearchOutlined,
  FireOutlined,
  GlobalOutlined,
  PlusOutlined,
  PictureOutlined,
  WarningOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { getDisplayImageUrl } from "@/utils/googleDrive";

const { Text } = Typography;

const provinces = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cần Thơ",
  "Cao Bằng",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "TP Hồ Chí Minh",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

export const VehicleFormFields = ({
  carModels,
  notSeenReasons,
  sellReasons,
  buyReasons,
  users,
  type,
}: any) => {
  const form = Form.useFormInstance();
  const inspectStatus = Form.useWatch("inspectStatus", form);
  const isCertified = Form.useWatch("isCertified", form);
  const hasFine = Form.useWatch("hasFine", form);
  const isBuyType = type === "BUY";

  const insuranceregistrationDeadline = Form.useWatch(
    "insuranceregistrationDeadline",
    form,
  );
  const insuranceTNDS = Form.useWatch("insuranceTNDS", form);
  const insuranceVC = Form.useWatch("insuranceVC", form);

  const conditionOptions = [
    "Mức 5: Xuất sắc: gần như mới",
    "Mức 4: Rất tốt: Có thể trưng bày ngay",
    "Mức 3: Bình thường",
    "Mức 2: Cần phải sửa chữa",
    "Mức 1: Cần phải sửa chửa nhiều",
  ];

  // 🚀 LUỒNG MỚI: UPLOAD FILE LÊN SERVER/CLOUD ĐỂ LẤY URL CHUỖI SIÊU NHẸ
  const handleDirectUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    // Giới hạn file tải lên (ví dụ: 5MB thay vì phải ép xuống quá thấp như base64)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("File hình ảnh không được vượt quá 5MB!");
      onError(new Error("File quá lớn"));
      return;
    }

    try {
      // 1. Tạo FormData để chuẩn bị gửi file vật lý lên API endpoint xử lý upload độc lập
      const formData = new FormData();
      formData.append("file", file);

      // 2. Gọi tới API endpoint chuyên upload file của bạn (Ví dụ: /api/upload)
      // API này sẽ upload ảnh thẳng lên S3, Cloudinary hoặc thư mục Server và trả về URL
      const response = await fetch("/api/uploadFile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Lỗi tải tập tin lên máy chủ lưu trữ.");
      }

      const data = await response.json(); // Kỳ vọng nhận về kết quả dạng: { url: "https://..." }

      // 3. Báo cho Ant Design biết upload đã thành công và truyền URL mạng vào để lưu
      onSuccess({
        uid: file.uid,
        name: file.name,
        status: "done",
        url: data.url, // URL sạch từ cloud, lưu vào DB cực nhẹ
      });

      message.success(`Tải lên file ${file.name} thành công.`);
    } catch (error: any) {
      console.error("UPLOAD ERROR:", error);
      onError(error);
      message.error(`Tải file ${file.name} thất bại.`);
    }
  };

  // Hàm chuẩn hóa dữ liệu từ Upload list sang cấu trúc dữ liệu gửi lên DB
  const normFile = (e: any) => {
    if (Array.isArray(e)) return e;

    // Chỉ lấy và giữ lại những file đã upload thành công hoặc file cũ đã có URL sẵn
    return (
      e?.fileList?.map((file: any) => {
        if (file.response && file.response.url) {
          const fileIdentifier = file.response.url; // ID Drive hoặc Link Cloudinary
          return {
            uid: file.uid,
            name: file.name,
            status: "done",
            url: file.response.url, // Ép URL này vào data form chính
            thumbUrl: getDisplayImageUrl(fileIdentifier, file.name),
          };
        }
        return {
          ...file,
          thumbUrl: getDisplayImageUrl(file.url, file.name),
        };
      }) || []
    );
  };

  const showInspectionDetails = !isBuyType && inspectStatus === "INSPECTED";

  return (
    <div className="animate-fadeIn pb-8">
      {/* --- SECTION 1: THÔNG TIN KHÁCH HÀNG & ĐỊA LÝ --- */}
      <Divider className="!mb-6">
        <Space>
          <FireOutlined className="text-orange-500" />
          <Text strong className="uppercase text-slate-600">
            Phân loại & Thông tin khách hàng
          </Text>
        </Space>
      </Divider>

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={8}>
          <Form.Item name="fullName" label="Tên khách hàng">
            <Input className="bg-gray-50 font-bold text-indigo-600" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="phone" label="Số điện thoại">
            <Input disabled className="bg-gray-50 font-bold" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="urgencyLevel"
            label="Trạng thái khách hàng"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Chọn độ nóng"
              options={[
                { value: "HOT", label: "HOT" },
                { value: "WARM", label: "WARM" },
                { value: "COOL", label: "COOL" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="province"
            label="Tỉnh/Thành phố"
            rules={[{ required: isBuyType ? false : true }]}
          >
            <Select
              showSearch
              placeholder="Chọn tỉnh thành"
              options={provinces.map((p) => ({ label: p, value: p }))}
              suffixIcon={<GlobalOutlined />}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={16}>
          <Form.Item name="address" label="Địa chỉ chi tiết">
            <Input
              prefix={<HomeOutlined className="text-slate-400" />}
              placeholder="Số nhà, tên đường, phường/xã..."
            />
          </Form.Item>
        </Col>

        {isBuyType && (
          <>
            <Col xs={24} md={8}>
              <Form.Item name="buyReasonId" label="Mục đích mua xe">
                <Select
                  placeholder="Chọn lý do mua xe"
                  options={buyReasons?.map((r: any) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="dateViewCar"
                label="Ngày xem xe"
                rules={[{ required: true, message: "Nhập Ngày xem xe" }]}
              >
                <DatePicker
                  classNames={{ popup: { root: "mobile-center-picker" } }}
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                />
              </Form.Item>
            </Col>
          </>
        )}
      </Row>

      {/* --- SECTION 2: CÔNG TÁC GIÁM ĐỊNH & PHÁP LÝ --- */}
      {!isBuyType && (
        <Card className="bg-slate-50/50 border-slate-200 rounded-3xl mb-8 shadow-sm">
          <Divider className="!m-0 !mb-6">
            <Space>
              <FileSearchOutlined className="text-indigo-500" />
              <Text strong className="uppercase text-slate-600">
                Chi tiết giám định & Pháp lý xe
              </Text>
            </Space>
          </Divider>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={6}>
              <Form.Item
                name="inspectStatus"
                label="Tình trạng xem xe"
                rules={[{ required: isBuyType ? false : true }]}
              >
                <Select placeholder="Chọn trạng thái">
                  <Select.Option value="NOT_INSPECTED">
                    ❌ Chưa xem xe
                  </Select.Option>
                  <Select.Option value="APPOINTED">📅 Hẹn xem xe</Select.Option>
                  <Select.Option value="INSPECTED">✅ Đã xem xe</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="inspectorId"
                label="Nhân viên giám định"
                rules={[
                  { required: !isBuyType && inspectStatus === "INSPECTED" },
                ]}
              >
                <Select
                  showSearch
                  placeholder="Chọn nhân viên"
                  options={users?.map((u: any) => ({
                    value: u.id,
                    label: u.fullName || u.username,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="inspectDoneDate"
                label="Ngày hoàn tất GĐ"
                rules={[
                  { required: !isBuyType && inspectStatus === "INSPECTED" },
                ]}
              >
                <DatePicker
                  classNames={{ popup: { root: "mobile-center-picker" } }}
                  className="w-full"
                  showTime
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                name="hasFine"
                label="Vi phạm phạt nguội?"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="CÒN VI PHẠM"
                  unCheckedChildren="SẠCH"
                  className={hasFine ? "bg-red-500" : "bg-emerald-500"}
                />
              </Form.Item>
            </Col>

            {hasFine && (
              <Col span={24} className="animate-slideDown">
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-6">
                  <Form.Item
                    name="fineNote"
                    label={
                      <Text strong className="text-red-700">
                        <WarningOutlined /> Chi tiết lỗi & Số tiền phạt dự kiến
                      </Text>
                    }
                    rules={[
                      {
                        required: true,
                        message:
                          "Vui lòng nhập chi tiết phạt nguội để thẩm định giá!",
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Nhập mã lỗi, ngày vi phạm, địa điểm..."
                    />
                  </Form.Item>
                </div>
              </Col>
            )}

            <Col xs={24} md={12}>
              <Form.Item
                name="inspectLocation"
                label="Địa điểm giám định"
                rules={[
                  { required: !isBuyType && inspectStatus === "INSPECTED" },
                ]}
              >
                <Select
                  placeholder="Chọn nơi xem xe"
                  className="custom-select-responsive"
                  options={[
                    {
                      value: "Toyota Bình Dương",
                      label: "Tại Toyota Bình Dương",
                    },
                    { value: "Toyota Mỹ Phước", label: "Tại Toyota Mỹ Phước" },
                    { value: "Nhà khách hàng", label: "Tại nhà khách hàng" },
                    {
                      value: "Công ty khách hàng",
                      label: "Tại công ty khách hàng",
                    },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="sellReasonId"
                label="Nhu cầu khách / Lý do bán"
                rules={[{ required: isBuyType ? false : true }]}
              >
                <Select
                  placeholder="Chọn lý do hệ thống"
                  className="custom-select-responsive"
                  dropdownMatchSelectWidth={false}
                  listHeight={300}
                  options={sellReasons?.map((r: any) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </Form.Item>
            </Col>

            {inspectStatus === "NOT_INSPECTED" && (
              <Col span={24}>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <Form.Item
                    name="notSeenReasonId"
                    label={
                      <Text strong className="text-amber-700">
                        Lý do chưa xem xe
                      </Text>
                    }
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={notSeenReasons?.map((r: any) => ({
                        value: r.id,
                        label: r.name,
                      }))}
                    />
                  </Form.Item>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* --- SECTION 3: THÔNG SỐ KỸ THUẬT XE --- */}
      <Divider className="!mb-6">
        <Space>
          <CarOutlined className="text-blue-500" />
          <Text strong className="uppercase text-slate-600">
            Thông số kỹ thuật xe
          </Text>
        </Space>
      </Divider>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={8}>
          <Form.Item
            name="carModelId"
            label="Dòng xe"
            rules={[
              { required: !isBuyType, message: "Vui lòng chọn dòng xe!" },
            ]}
          >
            <Select
              showSearch
              allowClear
              placeholder="Chọn dòng xe"
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={carModels.map((m: any) => ({
                value: m.id,
                label: m.name,
              }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="modelName"
            label="Phiên bản / Grade"
            rules={[{ required: !isBuyType }]}
          >
            <Input placeholder="Ví dụ: 1.5G, 2.0V, Premium..." />
          </Form.Item>
        </Col>
        {!isBuyType && (
          <Col xs={24} md={8}>
            <Form.Item
              name="licensePlate"
              label="Biển số xe"
              rules={[{ required: !isBuyType }]}
              getValueFromEvent={(e) =>
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 10)
              }
            >
              <Input
                className="font-bold uppercase"
                placeholder="30H12345"
                suffix={<InfoCircleOutlined className="text-slate-300" />}
              />
            </Form.Item>
          </Col>
        )}
        <Col xs={12} md={6}>
          <Form.Item
            name="year"
            label="Năm sản xuất"
            rules={[{ required: !isBuyType }]}
          >
            <InputNumber className="w-full" placeholder="2022" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
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
        <Col xs={12} md={6}>
          <Form.Item name="origin" label="Xuất xứ">
            <Select
              options={[
                { value: "VN", label: "Trong nước" },
                { value: "OTHER", label: "Nhập khẩu" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="engineSize" label="Dung tích động cơ">
            <Input placeholder="1.5L" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="odo"
            label="Số ODO (km)"
            rules={[{ required: !isBuyType }]}
          >
            <InputNumber
              className="w-full"
              formatter={(val) =>
                `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(val) => val!.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="transmission"
            label="Hộp số"
            rules={[{ required: !isBuyType }]}
          >
            <Select
              options={[
                { value: "AUTOMATIC", label: "Số tự động" },
                { value: "MANUAL", label: "Số sàn" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="fuelType"
            label="Nhiên liệu"
            rules={[{ required: !isBuyType }]}
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
          <Form.Item name="vin" label="Số khung (VIN)">
            <Input
              className="uppercase font-mono"
              placeholder="Nhập 17 ký tự..."
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="engineNumber" label="Số máy">
            <Input className="uppercase font-mono" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="color"
            label="Màu ngoại thất"
            rules={[{ required: !isBuyType }]}
          >
            <Input placeholder="Trắng, Đen, Đỏ..." />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="interiorColor"
            label="Màu nội thất"
            rules={[{ required: !isBuyType }]}
          >
            <Input placeholder="Trắng, Đen, Đỏ..." />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="seats"
            label="Số chỗ ngồi"
            rules={[{ required: !isBuyType }]}
          >
            <InputNumber className="w-full" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            name="driveTrain"
            label="Hệ dẫn động"
            rules={[{ required: !isBuyType }]}
          >
            <Select
              placeholder="Chọn hệ dẫn động"
              options={[
                { value: "FWD", label: "Cầu trước (FWD)" },
                { value: "RWD", label: "Cầu sau (RWD)" },
                { value: "AWD", label: "4 bánh toàn thời gian (AWD)" },
                { value: "4WD", label: "2 cầu (4WD)" },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      {showInspectionDetails && (
        <div className="animate-fadeIn">
          <Divider className="!my-8">
            <Space>
              <SafetyCertificateOutlined className="text-emerald-500" />
              <Text strong className="uppercase text-slate-600">
                Đánh giá chất lượng & Chứng nhận
              </Text>
            </Space>
          </Divider>

          <Card className="bg-emerald-50/30 border-emerald-100 rounded-3xl mb-8 shadow-sm">
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="conditionGrade"
                  label="Phân loại tình trạng xe"
                  rules={[
                    { required: true, message: "Vui lòng đánh giá hạng xe" },
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
                <Form.Item
                  name="isCertified"
                  label="Chứng nhận xe đạt chuẩn (Certified)?"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch
                    checkedChildren="ĐẠT CHUẨN"
                    unCheckedChildren="KHÔNG ĐẠT"
                    className={isCertified ? "bg-emerald-600" : "bg-red-400"}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="certificationNote"
                  label="Ghi chú đánh giá / Lý do đạt hoặc không đạt chuẩn"
                  rules={[
                    {
                      required: !isCertified,
                      message: "Vui lòng ghi rõ lý do nếu không đạt chuẩn",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Ví dụ: Xe đạt chuẩn T-Sure Gold / Xe có vết đâm đụng nhẹ ở cản sau nên không cấp certified..."
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* --- SECTION 4: TÀI CHÍNH & HẠN ĐỊNH --- */}
      <Divider className="!my-8">
        <Space>
          <DollarOutlined className="text-emerald-500" />
          <Text strong className="uppercase text-slate-600">
            Tài chính & Hạn định pháp lý
          </Text>
        </Space>
      </Divider>

      <Row gutter={[16, 0]}>
        <Col xs={24} md={12}>
          <Form.Item name="expectedPrice" label="Giá khách mong muốn">
            <InputNumber
              className="w-full! border-emerald-200"
              addonAfter="VNĐ"
              formatter={(val) =>
                `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="tSurePrice" label="Định giá T-Sure dự kiến">
            <InputNumber
              className="w-full! border-indigo-200 bg-indigo-50/30"
              addonAfter="VNĐ"
              formatter={(val) =>
                `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
            />
          </Form.Item>
        </Col>
        {!isBuyType && (
          <Col xs={24} md={8}>
            <Form.Item
              name="ownerType"
              label="Hình thức sở hữu"
              rules={[{ required: !isBuyType }]}
            >
              <Select
                options={[
                  { label: "Chính chủ", value: "PERSONAL" },
                  { label: "Ủy quyền L1", value: "AUTHORIZATION_L1" },
                  { label: "Ủy quyền L2", value: "AUTHORIZATION_L2" },
                  { label: "Công ty / VAT", value: "COMPANY_VAT" },
                ]}
              />
            </Form.Item>
          </Col>
        )}

        <Col xs={12} md={8}>
          <Form.Item
            name="insuranceregistrationDeadline"
            label="Đăng kiểm"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="CÒN HẠN"
              unCheckedChildren="HẾT/KHÔNG CÓ"
              className={insuranceregistrationDeadline ? "bg-blue-500" : ""}
            />
          </Form.Item>
          {insuranceregistrationDeadline && (
            <Form.Item
              name="registrationDeadline"
              label="Hạn đăng kiểm"
              rules={[{ required: !isBuyType }]}
            >
              <DatePicker
                classNames={{ popup: { root: "mobile-center-picker" } }}
                className="w-full"
                format="DD/MM/YYYY"
              />
            </Form.Item>
          )}
        </Col>

        <Col xs={12} md={8}>
          <Form.Item
            name="insuranceTNDS"
            label="Bảo hiểm TNDS"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="CÒN HẠN"
              unCheckedChildren="HẾT/KHÔNG CÓ"
              className={insuranceTNDS ? "bg-blue-500" : ""}
            />
          </Form.Item>
          {insuranceTNDS && (
            <div className="animate-slideDown space-y-2">
              <Form.Item
                name="insuranceDSCorp"
                label="Đơn vị bảo hiểm TNDS"
                rules={[{ required: true, message: "Nhập tên hãng bảo hiểm" }]}
              >
                <Input placeholder="Ví dụ: Bảo Việt, Liberty, PVI..." />
              </Form.Item>
              <Form.Item
                name="insuranceTNDSDeadline"
                label="Hạn bảo hiểm TNDS"
                rules={[{ required: true, message: "Nhập ngày hết hạn TNDS" }]}
              >
                <DatePicker
                  classNames={{ popup: { root: "mobile-center-picker" } }}
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                />
              </Form.Item>
            </div>
          )}
        </Col>

        <Col xs={12} md={8}>
          <Form.Item
            name="insuranceVC"
            label="Bảo hiểm vật chất"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="CÒN HẠN"
              unCheckedChildren="HẾT/KHÔNG CÓ"
              className={insuranceVC ? "bg-orange-500" : ""}
            />
          </Form.Item>
          {insuranceVC && (
            <div className="animate-slideDown space-y-2">
              <Form.Item
                name="insuranceVCCorp"
                label="Đơn vị bảo hiểm VC"
                rules={[{ required: true, message: "Nhập tên hãng bảo hiểm" }]}
              >
                <Input placeholder="Ví dụ: Bảo Việt, Liberty, PVI..." />
              </Form.Item>
              <Form.Item
                name="insuranceVCDeadline"
                label="Hạn bảo hiểm vật chất"
                rules={[{ required: true, message: "Nhập ngày hết hạn VC" }]}
              >
                <DatePicker
                  classNames={{ popup: { root: "mobile-center-picker" } }}
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                />
              </Form.Item>
            </div>
          )}
        </Col>

        <Col xs={24}>
          <Form.Item name="note" label="Ghi chú tổng quát tình trạng xe">
            <Input.TextArea
              rows={3}
              placeholder="Mô tả các hạng mục lỗi kỹ thuật, thân vỏ hoặc ghi chú quan trọng khác..."
            />
          </Form.Item>
        </Col>
      </Row>

      {/* --- SECTION 5: HÌNH ẢNH & TÀI LIỆU (ĐÃ FIX CHUYỂN QUA URL ONLINE) --- */}
      {!isBuyType && (
        <>
          <Divider className="!my-8">
            <Space>
              <PictureOutlined className="text-rose-500" />
              <Text strong className="uppercase text-slate-600">
                Hình ảnh & Chứng từ gốc
              </Text>
            </Space>
          </Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <CarOutlined /> Ảnh xe thực tế (Giám định)
                  </Space>
                }
                className="rounded-3xl border-dashed"
              >
                <Form.Item
                  name="carImages"
                  label="Ảnh xe thực tế (Giám định)"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  rules={[
                    { required: !isBuyType && inspectStatus === "INSPECTED" },
                  ]}
                >
                  <Upload
                    customRequest={handleDirectUpload} // 🔥 Luồng mới: Upload trực tiếp lấy URL
                    listType="picture-card"
                    multiple
                    accept="image/*"
                  >
                    <div>
                      <PlusOutlined />
                      <div className="mt-2">Tải ảnh</div>
                    </div>
                  </Upload>
                </Form.Item>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <HomeOutlined /> Tài liệu hồ sơ (Đăng kiểm/Cà vẹt)
                  </Space>
                }
                className="rounded-3xl border-dashed"
              >
                <Form.Item
                  name="documents"
                  label="Tài liệu hồ sơ (Đăng kiểm/Cà vẹt)"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  rules={[
                    { required: !isBuyType && inspectStatus === "INSPECTED" },
                  ]}
                >
                  <Upload
                    customRequest={handleDirectUpload} // 🔥 Luồng mới: Upload trực tiếp lấy URL
                    listType="picture"
                    multiple
                    accept="image/*,application/pdf"
                  >
                    <Button
                      icon={<PlusOutlined />}
                      className="w-full rounded-xl border-dashed h-12"
                    >
                      TẢI TÀI LIỆU
                    </Button>
                  </Upload>
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};
