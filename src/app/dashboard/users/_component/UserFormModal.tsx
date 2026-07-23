/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Modal, Form, Row, Col, Input, Select, Switch, Typography } from "antd";
import { IdcardOutlined, PhoneOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function UserFormModal({
  isFullRole,
  open,
  onCancel,
  editingUser,
  form,
  departments,
  branches,
  positions,
  onDeptChange,
  onFinish,
  loading,
}: any) {
  const roleValue = Form.useWatch("role", form);

  return (
    <Modal
      title={editingUser ? "CẬP NHẬT TÀI KHOẢN" : "KHỞI TẠO NHÂN SỰ"}
      open={open}
      onCancel={onCancel}
      width={900}
      centered
      onOk={() => form.submit()}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="p-6">
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true }]}
            >
              <Input
                disabled={!!editingUser}
                prefix={<IdcardOutlined />}
                className="h-10 rounded-lg"
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="fullName"
              label="Họ và tên"
              rules={[{ required: true }]}
            >
              <Input className="h-10 rounded-lg" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: "email" }]}
            >
              <Input className="h-10 rounded-lg" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Số điện thoại">
              <Input className="h-10 rounded-lg" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="departmentId" label="Phòng ban">
              <Select
                placeholder="Đơn vị"
                className="h-10"
                onChange={onDeptChange}
                options={departments.map((d: any) => ({
                  label: d.name,
                  value: d.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="positionId" label="Chức vụ">
              <Select
                placeholder="Chức danh"
                className="h-10"
                options={positions.map((p: any) => ({
                  label: p.name,
                  value: p.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="branchId" label="Chi nhánh">
              <Select
                allowClear
                placeholder="Trụ sở"
                className="h-10"
                options={branches.map((b: any) => ({
                  label: b.name,
                  value: b.id,
                }))}
              />
            </Form.Item>
          </Col>
          {isFullRole && (
            <>
              <Col span={12}>
                <Form.Item
                  name="isGlobalManager"
                  label="Quản trị tổng"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="active"
                  label="Hoạt động"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                </Form.Item>
              </Col>

              <Col span={24} className="mt-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <Row gutter={24}>
                    <Col span={6}>
                      <Form.Item
                        name="role"
                        label="Phân quyền"
                        rules={[{ required: true }]}
                      >
                        <Select className="h-10">
                          <Select.Option value="ADMIN">Admin</Select.Option>
                          <Select.Option value="MANAGER">Quản lý</Select.Option>
                          <Select.Option value="PURCHASE_STAFF">
                            Thu mua
                          </Select.Option>
                          <Select.Option value="SALES_STAFF">
                            Bán hàng
                          </Select.Option>
                          <Select.Option value="APPRAISER">
                            Giám định
                          </Select.Option>
                          <Select.Option value="REFERRER">
                            Giới thiệu
                          </Select.Option>
                          <Select.Option value="SALE_MANAGER">
                            Quản lý bán hàng
                          </Select.Option>
                          <Select.Option value="ADMIN_MANAGER">
                            Quản lý Admin
                          </Select.Option>
                          <Select.Option value="MARKETING">
                            Marketing
                          </Select.Option>

                          <Select.Option value="GSM">
                            Trưởng phòng
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="status" label="Quy trình Duyệt">
                        <Select
                          className="h-10"
                          options={[
                            { label: "Chờ duyệt", value: "PENDING" },
                            { label: "Đã duyệt", value: "APPROVED" },
                            { label: "Từ chối", value: "REJECTED" },
                            { label: "Khóa (Ban)", value: "BANNED" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="password" label="Mật khẩu">
                        <Input.Password
                          className="h-10 rounded-lg"
                          placeholder="••••••••"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </Col>

              {["MANAGER", "PURCHASE_STAFF", "SALES_STAFF"].includes(
                roleValue,
              ) && (
                <Col span={24} className="mt-4">
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-6 items-center">
                    <div className="bg-blue-600 p-3 rounded-xl text-white">
                      <PhoneOutlined className="text-xl" />
                    </div>
                    <div className="flex-1">
                      <Text strong className="text-blue-800 block mb-3">
                        Cấu hình VoIP
                      </Text>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="extension"
                            label="Ext"
                            className="m-0"
                          >
                            <Input
                              placeholder="101"
                              className="h-10 rounded-lg"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="extensionPwd"
                            label="Mật khẩu SIP"
                            className="m-0"
                          >
                            <Input.Password className="h-10 rounded-lg" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Col>
              )}
            </>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
