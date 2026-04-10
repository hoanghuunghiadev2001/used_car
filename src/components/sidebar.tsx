/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Layout, Menu, Drawer, Button, Typography, Tag } from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  UserAddOutlined,
  SolutionOutlined,
  TeamOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
  SettingOutlined,
  HistoryOutlined,
  LogoutOutlined,
  AccountBookOutlined,
  MenuOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SnippetsOutlined,
  ClockCircleFilled,
  ClockCircleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useState } from "react";

const { Sider } = Layout;
const { Text } = Typography;

type Role =
  | "ADMIN"
  | "MANAGER"
  | "PURCHASE_STAFF"
  | "SALES_STAFF"
  | "REFERRER"
  | "APPRAISER"
  | "SALE_MANAGER"
  | "ADMIN_MANAGER";

interface SidebarProps {
  role: Role;
  isGobal: boolean;
}

export default function Sidebar({ role, isGobal }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    ADMIN: { label: "Quản trị hệ thống", color: "#f5222d" },
    MANAGER: { label: "Quản lý chi nhánh", color: "#1890ff" },
    PURCHASE_STAFF: { label: "NV Thu mua", color: "#faad14" },
    SALES_STAFF: { label: "NV Bán hàng", color: "#52c41a" },
    REFERRER: { label: "Người giới thiệu", color: "#8c8c8c" },
    APPRAISER: { label: "Định giá viên", color: "#722ed1" },
    SALE_MANAGER: { label: "Quản lý bán hàng", color: "#13c2c2" },
    ADMIN_MANAGER: { label: "Quản lý Admin", color: "#eb2f96" },
  };

  // Helper check quyền
  const hasAccess = (allowedRoles: Role[]) => allowedRoles.includes(role);

  const menuItems: any[] = [
    // 1. TỔNG QUAN (Dành cho mọi nhân sự nội bộ)

    hasAccess(["SALES_STAFF", "PURCHASE_STAFF"]) && {
      key: "/dashboard/staff-dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard/staff-dashboard">Bảng hiệu suất</Link>,
    },
    hasAccess(["ADMIN", "MANAGER", "APPRAISER"]) && {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link href="/">Bảng hiệu suất</Link>,
    },

    {
      key: "/dashboard/showroom",
      icon: <HomeOutlined />,
      label: <Link href="/dashboard/showroom">Showroom</Link>,
    },

    // 2. NGHIỆP VỤ CỐT LÕI
    {
      type: "group",
      label: !collapsed ? "NGHIỆP VỤ CHÍNH" : "",
      children: [
        {
          key: "referral-menu",
          icon: <UserAddOutlined />,
          label: "Giới thiệu khách",
          children: [
            {
              key: "/dashboard/referrals/new",
              label: (
                <Link href="/dashboard/referrals/new">Tạo giới thiệu</Link>
              ),
            },
            {
              key: "/dashboard/my-referrals",
              label: (
                <Link href="/dashboard/my-referrals">Lịch sử của tôi</Link>
              ),
            },
          ],
        },
        hasAccess(["ADMIN", "SALES_STAFF"]) && {
          key: "sales-ops",
          icon: <SolutionOutlined />,
          label: "Nghiệp vụ Sale",
          children: [
            {
              key: "/dashboard/sales-inventory",
              label: (
                <Link href="/dashboard/sales-inventory">Xử lý khách hàng</Link>
              ),
            },
            {
              key: "/dashboard/customer-actioned",
              label: (
                <Link href="/dashboard/customer-actioned">
                  Khách hàng đã xử lý
                </Link>
              ),
            },
            {
              key: "/dashboard/contract-sales",
              label: <Link href="/dashboard/contract">Hợp đồng bán</Link>,
            },
            {
              key: "/dashboard/sales/history",
              label: (
                <Link href="/dashboard/sales/history">Lịch sử giao dịch</Link>
              ),
            },
          ],
        },
        hasAccess(["ADMIN", "PURCHASE_STAFF", "APPRAISER"]) && {
          key: "purchase-ops",
          icon: <AccountBookOutlined />,
          label: "Nghiệp vụ Thu mua",
          children: [
            {
              key: "/dashboard/assigned-tasks",
              label: (
                <Link href="/dashboard/assigned-tasks">Định giá & Thu mua</Link>
              ),
            },
            {
              key: "/dashboard/customer-actioned",
              label: (
                <Link href="/dashboard/customer-actioned">
                  Khách hàng đã xử lý
                </Link>
              ),
            },
            hasAccess(["ADMIN", "PURCHASE_STAFF"]) && {
              key: "/dashboard/contract-purchase",
              label: <Link href="/dashboard/contract">Hợp đồng mua</Link>,
            },
            {
              key: "/dashboard/purchase/history",
              label: (
                <Link href="/dashboard/purchase/history">Lịch sử thu mua</Link>
              ),
            },
          ].filter(Boolean),
        },
      ].filter(Boolean),
    },

    // 3. QUẢN TRỊ (Manager & Admin)
    hasAccess(["ADMIN", "MANAGER"]) && {
      type: "group",
      label: !collapsed ? "QUẢN TRỊ VẬN HÀNH" : "",
      children: [
        {
          key: "manage-leads",
          icon: <TeamOutlined />,
          label: "Quản lý khách hàng",
          children: [
            {
              key: "/dashboard/customers",
              label: <Link href="/dashboard/customers">Phân bổ khách</Link>,
            },
            {
              key: "/dashboard/lead",
              label: <Link href="/dashboard/lead">Danh sách tổng</Link>,
            },
            {
              key: "/dashboard/frozen-leads",
              label: (
                <Link href="/dashboard/frozen-leads">
                  Danh sách khách đóng băng
                </Link>
              ),
            },
            {
              key: "/dashboard/contract-admin",
              icon: <SnippetsOutlined />,
              label: <Link href="/dashboard/contract">Hợp đồng</Link>,
            },
            {
              key: "/dashboard/late-kpi-report",
              icon: <BarChartOutlined />,
              label: (
                <Link href="/dashboard/late-kpi-report">Báo cáo trễ KPI</Link>
              ),
            },
          ],
        },
        {
          key: "manage-cars",
          icon: <CarOutlined />,
          label: "Quản lý kho xe",
          children: [
            {
              key: "/dashboard/cars",
              label: <Link href="/dashboard/cars">Kho xe</Link>,
            },
            {
              key: "/dashboard/admin/approval-customer",
              icon: <CheckCircleOutlined />,
              label: (
                <Link href="/dashboard/admin/approval-customer">
                  Duyệt yêu cầu
                </Link>
              ),
            },
            {
              key: "/dashboard/cars/pending",
              label: (
                <Link href="/dashboard/cars/pending">Xe chờ định giá</Link>
              ),
            },
            {
              key: "/dashboard/inventory-report",
              icon: <FileTextOutlined />,
              label: (
                <Link href="/dashboard/inventory-report">Báo cáo xuất kho</Link>
              ),
            },
          ],
        },
      ],
    },
    {
      type: "group",
      label: !collapsed ? "LỊCH TRỰC" : "",
      children: [
        {
          key: "/dashboard/schedules",
          icon: <ScheduleOutlined />,
          label: <Link href="/dashboard/schedules">Lịch trực</Link>,
        },
      ],
    },
    {
      type: "group",
      label: !collapsed ? "HOẠT ĐỘNG HÔM NAY" : "",
      children: [
        {
          key: "/dashboard/staff-activities",
          icon: <ClockCircleOutlined />,
          label: (
            <Link href="/dashboard/staff-activities">Hoạt động nhân viên</Link>
          ),
        },
      ],
    },

    (hasAccess(["ADMIN", "MANAGER"]) || isGobal) && {
      type: "group",
      label: !collapsed ? "IM Xe mới" : "",
      children: [
        {
          key: "/dashboard/new-car-inbound",
          icon: <CarOutlined />,
          label: <Link href="/dashboard/new-car-inbound">IM Xe mới</Link>,
        },
      ],
    },

    // 4. HỆ THỐNG
    hasAccess(["ADMIN", "MANAGER"]) && {
      type: "group",
      label: !collapsed ? "HỆ THỐNG" : "",
      children: [
        {
          key: "/dashboard/users",
          icon: <TeamOutlined />,
          label: <Link href="/dashboard/users">Nhân sự</Link>,
        },

        (role === "ADMIN" || isGobal) && {
          key: "settings",
          icon: <SettingOutlined />,
          label: "Cấu hình",
          children: [
            {
              key: "/dashboard/settings/car-setup",
              label: <Link href="/dashboard/settings/car-setup">Mẫu xe</Link>,
            },
            {
              key: "/dashboard/settings/branches",
              label: <Link href="/dashboard/settings/branches">Chi nhánh</Link>,
            },
            {
              key: "/dashboard/settings/departments",
              label: (
                <Link href="/dashboard/settings/departments">Phòng ban</Link>
              ),
            },
            {
              key: "/dashboard/settings/lead",
              label: (
                <Link href="/dashboard/settings/lead">
                  Trạng thái khách hàng
                </Link>
              ),
            },
            {
              key: "/dashboard/settings/reasons",
              label: (
                <Link href="/dashboard/settings/admin-reasons">
                  Setup lý do
                </Link>
              ),
            },
          ],
        },
      ].filter(Boolean),
    },
    hasAccess(["SALE_MANAGER"]) && {
      key: "/sale-manager/customer-list",
      icon: <DashboardOutlined />,
      label: (
        <Link href="/sale-manager/customer-list">Danh sách khách hàng</Link>
      ),
    },
    // 5. CÁ NHÂN
    {
      key: "account-group",
      label: !collapsed ? "TÀI KHOẢN" : "",
      type: "group",
      children: [
        {
          key: "/dashboard/profile",
          icon: <HistoryOutlined />,
          label: <Link href="/dashboard/profile">Hồ sơ của tôi</Link>,
        },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          danger: true,
          label: <span onClick={handleLogout}>Đăng xuất</span>,
        },
      ],
    },
  ].filter(Boolean);

  const SidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-[#001529]">
      <div className="flex flex-col items-center py-8 px-4 border-b border-gray-800">
        <div className="w-14 h-14 bg-white rounded-2xl p-1 shadow-lg mb-3 shrink-0">
          <img
            src="/storage/images/logo.jpg"
            alt="Logo"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
        {(!collapsed || isMobile) && (
          <div className="text-center">
            <div className="text-white font-black text-sm uppercase">
              TOYOTA BÌNH DƯƠNG
            </div>
            <Tag
              color={ROLE_LABELS[role]?.color}
              className="mt-2 font-bold text-[9px] uppercase border-none"
            >
              {ROLE_LABELS[role]?.label}
            </Tag>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        defaultOpenKeys={menuItems.filter((i) => i.children).map((i) => i.key)}
        items={menuItems}
        onClick={() => setVisible(false)}
        className="font-medium h-[calc(100vh-160px)] overflow-y-auto grow py-4 custom-sidebar-menu"
        style={{ background: "transparent" }}
      />
    </div>
  );

  return (
    <>
      <Button
        className="lg:hidden! fixed! top-4 left-4 z-[100] bg-red-600 border-none text-white h-10 w-10 flex items-center justify-center rounded-xl"
        icon={<MenuOutlined />}
        onClick={() => setVisible(true)}
      />

      <Drawer
        placement="left"
        onClose={() => setVisible(false)}
        open={visible}
        styles={{ body: { padding: 0 } }}
        width={280}
        closable={false}
      >
        {SidebarContent(true)}
      </Drawer>

      <Sider
        width={260}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
        theme="dark"
        className="hidden lg:block h-screen sticky top-0 left-0 shadow-2xl z-40 overflow-hidden"
      >
        {SidebarContent(false)}
      </Sider>

      <style jsx global>{`
        .ant-menu-item-group-title {
          font-size: 10px !important;
          color: #4a5568 !important;
          font-weight: 800 !important;
          padding-top: 24px !important;
          text-transform: uppercase;
        }
        .ant-menu-item-selected {
          background-color: #ff4d4f20 !important;
          color: #ff4d4f !important;
          border-right: 3px solid #ff4d4f;
        }
        .custom-sidebar-menu::-webkit-scrollbar {
          width: 4px;
        }
        .custom-sidebar-menu::-webkit-scrollbar-thumb {
          background: #2d3748;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
