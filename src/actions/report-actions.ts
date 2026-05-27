/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";
import dayjs from "@/lib/dayjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-server";
import { serializeData } from "@/utils/date-format";
import { LeadStatus, ReferralType } from "@prisma/client";

// Định nghĩa kiểu dữ liệu cho User từ Session
interface AuthUser {
  role: string;
  id: string;
  branchId?: string | null;
  isGlobalManager?: boolean;
}

// Hàm bổ trợ để tạo Filter dùng chung cho cả 3 báo cáo
function getReportFilters(
  year: number | undefined,
  month: number | undefined,
  user: AuthUser,
  selectedBranchId?: string,
  selectedUserId?: string,
) {
  const isHighLevel = user.role === "ADMIN" || user.isGlobalManager;
  const effectiveBranchId = isHighLevel ? selectedBranchId : user.branchId;
  const effectiveUserId = !isHighLevel
    ? user.role === "MANAGER"
      ? selectedUserId
      : user.id
    : selectedUserId;

  const reportYear = year ?? dayjs().year();

  // Luôn tạo filter cho cả năm để vẽ biểu đồ
  const fullYearFilter = {
    gte: dayjs().year(reportYear).startOf("year").toDate(),
    lte: dayjs().year(reportYear).endOf("year").toDate(),
  };

  // Filter cụ thể (theo tháng hoặc năm) cho các bảng số liệu
  const specificFilter = month
    ? {
        gte: dayjs()
          .year(reportYear)
          .month(month - 1)
          .startOf("month")
          .toDate(),
        lte: dayjs()
          .year(reportYear)
          .month(month - 1)
          .endOf("month")
          .toDate(),
      }
    : fullYearFilter;

  return {
    timeWhere: { createdAt: specificFilter }, // Dùng cho stats/matrix
    fullYearWhere: { createdAt: fullYearFilter }, // Dùng cho biểu đồ 12 tháng
    branchFilter: effectiveBranchId ? { branchId: effectiveBranchId } : {},
    userFilter: effectiveUserId ? { userId: effectiveUserId } : {},
    reportYear,
  };
}
// ── INTERFACES TYPE-SAFE CHO DỮ LIỆU TRẢ VỀ ──
interface UrgencyStats {
  HOT: number;
  WARM: number;
  COOL: number;
  total: number;
}

interface InspectionMatrix {
  INSPECTED: UrgencyStats;
  APPOINTED: UrgencyStats;
  NOT_INSPECTED: UrgencyStats;
  total: number;
}

interface MonthlyAnalytics {
  monthIdx: number;
  monthName: string;
  SUCCESS: InspectionMatrix;
  LOSE: InspectionMatrix;
  FROZEN: InspectionMatrix;
  REMAINING: InspectionMatrix;
  trend: {
    SUCCESS: number;
    LOSE: number;
    FROZEN: number;
    REMAINING: number;
    HOT: number;
  };
}

// Thêm vào các interface hiện có của bạn
interface SummaryStats {
  totalActive: number; // Đang theo dõi (REMAINING)
  totalSuccess: number; // Thành công
  totalFrozen: number; // Đóng băng
  totalLost: number; // Thất bại
}

export interface SalesReportResponse {
  analytics: any; // Hoặc kiểu cụ thể của processLeadMatrix
  stats: {
    totalCustomersYear: number;
    total: number;
    late: number;
    // Sửa ở đây: Thay vì bắt trả về _count, ta định nghĩa rõ dữ liệu đã format
    performance: {
      fullName: string | null;
      count: number;
    }[];
    interestedModels: {
      name: string;
      count: number;
    }[];
  };
  monthlySummary: {
    totalActive: number;
    totalSuccess: number;
    totalFrozen: number;
    totalLost: number;
  };
}

export interface PurchaseReportResponse extends TabReportData {
  interestedModels: Array<{ name: string; count: number }>;
}

export interface TradeReportResponse extends TabReportData {
  inboundComparison: Array<{
    month: number;
    tradeSuccess: number; // Khách đổi xe thành công
    newCarsInbound: number; // Xe mới nhập về
  }>;
  totalNewCarsYear: number;
}

interface BranchYearlyStats {
  branchId: string;
  branchName: string;
  totalSales: number;
  totalPurchase: number;
  totalTrade: number;
  totalNewCars: number;
}

export interface ReportResponse {
  role: string;
  isGlobal: boolean;
  salesAnalytics: MonthlyAnalytics[];
  purchaseAnalytics: MonthlyAnalytics[];
  tradeAnalytics: MonthlyAnalytics[];
  interestedModelsByMonth: Array<{ modelName: string; count: number }>;
  branches: Array<{ id: string; name: string }>;
  newCarSalesByMonth: Array<{ month: number; totalNewCars: number }>;
  totalNewCarsYear: number;
  newCarPerBranch: Array<BranchYearlyStats> | null;
  stats: {
    sales: { total: number; late: number; performance: any[] };
    purchase: { total: number; late: number; performance: any[] };
    trade: { total: number; late: number; performance: any[] };
    inventoryStatus: any[];
    yearlyTotals: {
      system: {
        totalSales: number;
        totalPurchase: number;
        totalTrade: number;
        totalNewCars: number;
      };
      perBranch: BranchYearlyStats[];
    };
    growthChart: Array<{
      name: string;
      sales: number;
      purchase: number;
      trade: number;
    }>;
  };
}

// ── HÀM CHÍNH ĐÃ CẬP NHẬT ──
export async function getAdvancedReportAction(
  month?: number,
  year?: number,
  selectedBranchId?: string,
  selectedUserId?: string,
): Promise<ReportResponse> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { role, id: authId, branchId: userBranchId, isGlobalManager } = user;
  const isHighLevel = role === "ADMIN" || isGlobalManager;

  const effectiveBranchId = isHighLevel ? selectedBranchId : userBranchId;
  const effectiveUserId = !isHighLevel
    ? role === "MANAGER"
      ? selectedUserId || undefined
      : authId
    : selectedUserId;

  const reportYear = year ?? dayjs().year();

  // 1. Filter cho CẢ NĂM (Dành cho biểu đồ và Analytics 12 tháng)
  const fullYearFilter = {
    gte: dayjs().year(reportYear).startOf("year").toDate(),
    lte: dayjs().year(reportYear).endOf("year").toDate(),
  };

  // 2. Filter cho THÁNG CỤ THỂ (Dành cho các con số tổng/Stats)
  const specificFilter = month
    ? {
        gte: dayjs()
          .year(reportYear)
          .month(month - 1)
          .startOf("month")
          .toDate(),
        lte: dayjs()
          .year(reportYear)
          .month(month - 1)
          .endOf("month")
          .toDate(),
      }
    : fullYearFilter;

  const timeWhere = { createdAt: specificFilter };
  const fullYearWhere = { createdAt: fullYearFilter };
  const branchFilter = effectiveBranchId ? { branchId: effectiveBranchId } : {};
  const userFilter = effectiveUserId ? { userId: effectiveUserId } : {};

  // 3. Truy vấn dữ liệu
  const [
    totalSales,
    totalPurchased,
    totalTrades,
    lateSalesLeads,
    latePurchaseLeads,
    lateTradeLeads,
    branches,
    staffSalesPerformance,
    staffPurchasePerformance,
    staffTradePerformance,
    inventoryStatus,
    allLeadsForMatrix, // Dữ liệu này sẽ dùng fullYearWhere
    interestedModelsRaw,
    newCarSalesMonthlyRaw,
    totalNewCarsAgg,
    salesByBranch,
    purchaseByBranch,
    tradeByBranch,
    newCarByBranchRaw,
  ] = await Promise.all([
    // Stats: Chỉ đếm trong tháng đã chọn
    db.car.count({
      where: {
        status: "SOLD",
        ...timeWhere,
        ...branchFilter,
        contracts: { some: { type: "SALE" } },
      },
    }),
    db.car.count({
      where: {
        purchasedAt: { not: null },
        ...timeWhere,
        ...branchFilter,
        contracts: { some: { type: "PURCHASE" } },
      },
    }),
    db.customer.count({
      where: {
        type: ReferralType.SELL_TRADE_NEW,
        status: LeadStatus.DEAL_DONE,
        ...timeWhere,
        ...branchFilter,
      },
    }),

    // Late leads: Trong tháng đã chọn
    db.leadActivity.count({
      where: {
        isLate: true,
        customer: {
          type: { in: [ReferralType.BUY, ReferralType.SELL_TRADE_USED] },
          ...timeWhere,
          ...branchFilter,
        },
      },
    }),
    db.leadActivity.count({
      where: {
        isLate: true,
        customer: {
          type: {
            in: [
              ReferralType.SELL,
              ReferralType.VALUATION,
              ReferralType.SELL_TRADE_USED,
            ],
          },
          ...timeWhere,
          ...branchFilter,
        },
      },
    }),
    db.leadActivity.count({
      where: {
        isLate: true,
        customer: {
          type: ReferralType.SELL_TRADE_NEW,
          ...timeWhere,
          ...branchFilter,
        },
      },
    }),

    db.branch.findMany({ select: { id: true, name: true } }),

    // Performance: Trong tháng đã chọn
    db.user.findMany({
      where: {
        ...branchFilter,
        role: { in: ["SALES_STAFF", "ADMIN", "MANAGER"] },
        active: true,
      },
      select: {
        id: true,
        fullName: true,
        _count: { select: { soldCars: { where: timeWhere } } },
      },
      orderBy: { soldCars: { _count: "desc" } },
      take: 5,
    }),
    db.user.findMany({
      where: {
        ...branchFilter,
        role: { in: ["PURCHASE_STAFF", "APPRAISER"] },
        active: true,
      },
      select: {
        id: true,
        fullName: true,
        _count: { select: { purchases: { where: timeWhere } } },
      },
      orderBy: { purchases: { _count: "desc" } },
      take: 5,
    }),
    db.user.findMany({
      where: {
        ...branchFilter,
        role: { in: ["SALES_STAFF", "PURCHASE_STAFF"] },
        active: true,
      },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedLeads: {
              where: { type: ReferralType.SELL_TRADE_NEW, ...timeWhere },
            },
          },
        },
      },
      orderBy: { assignedLeads: { _count: "desc" } },
      take: 5,
    }),

    db.car.groupBy({
      by: ["status"],
      where: { ...branchFilter, ...timeWhere },
      _count: true,
    }),

    // QUAN TRỌNG: Lấy dữ liệu cả năm cho ma trận & biểu đồ
    db.customer.findMany({
      where: { ...fullYearWhere, ...branchFilter, ...userFilter },
      select: {
        type: true,
        status: true,
        inspectStatus: true,
        urgencyLevel: true,
        createdAt: true,
      },
    }),

    db.customer.groupBy({
      by: ["carModelId"],
      where: { carModelId: { not: null }, ...timeWhere, ...branchFilter },
      _count: true,
    }),

    // Xe mới nhập: Lấy cả năm để vẽ biểu đồ
    db.dailyCarInbound.groupBy({
      by: ["date"],
      where: { date: fullYearFilter, ...branchFilter },
      _sum: { totalCars: true },
      orderBy: { date: "asc" },
    }),

    db.dailyCarInbound.aggregate({
      where: { date: fullYearFilter, ...branchFilter },
      _sum: { totalCars: true },
    }),

    // GroupBy theo chi nhánh (Dùng timeWhere để tính tổng doanh số tháng/năm đang xem)
    db.car.groupBy({
      by: ["branchId"],
      where: { status: "SOLD", ...timeWhere },
      _count: true,
    }),
    db.car.groupBy({
      by: ["branchId"],
      where: { purchasedAt: { not: null }, ...timeWhere },
      _count: true,
    }),
    db.customer.groupBy({
      by: ["branchId"],
      where: {
        type: ReferralType.SELL_TRADE_NEW,
        status: LeadStatus.DEAL_DONE,
        ...timeWhere,
      },
      _count: true,
    }),
    db.dailyCarInbound.groupBy({
      by: ["branchId"],
      where: { date: specificFilter },
      _sum: { totalCars: true },
    }),
  ]);

  // 4. Xử lý dữ liệu
  const modelIds = [
    ...new Set(interestedModelsRaw.map((g: any) => g.carModelId)),
  ].filter(Boolean) as string[];
  const models = await db.carModel.findMany({
    where: { id: { in: modelIds } },
    select: { id: true, name: true },
  });
  const modelMap = new Map(models.map((m) => [m.id, m.name]));

  const perBranchStats = branches.map((b) => ({
    branchId: b.id,
    branchName: b.name,
    totalSales: salesByBranch.find((g) => g.branchId === b.id)?._count ?? 0,
    totalPurchase:
      purchaseByBranch.find((g) => g.branchId === b.id)?._count ?? 0,
    totalTrade: tradeByBranch.find((g) => g.branchId === b.id)?._count ?? 0,
    totalNewCars:
      newCarByBranchRaw.find((g) => g.branchId === b.id)?._sum.totalCars ?? 0,
  }));

  // 4.1 Xử lý Analytics 12 tháng
  const categories = {
    SUCCESS: [LeadStatus.DEAL_DONE],
    LOSE: [LeadStatus.LOSE, LeadStatus.CANCELLED, LeadStatus.REJECTED_APPROVAL],
    FROZEN: [LeadStatus.FROZEN],
  };

  const createEmptyMonth = (i: number): MonthlyAnalytics => ({
    monthIdx: i,
    monthName: `Tháng ${i + 1}`,
    SUCCESS: {
      INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      APPOINTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      NOT_INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      total: 0,
    },
    LOSE: {
      INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      APPOINTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      NOT_INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      total: 0,
    },
    FROZEN: {
      INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      APPOINTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      NOT_INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      total: 0,
    },
    REMAINING: {
      INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      APPOINTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      NOT_INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
      total: 0,
    },
    trend: { SUCCESS: 0, LOSE: 0, FROZEN: 0, REMAINING: 0, HOT: 0 },
  });

  const salesAnalyticsResult = Array.from({ length: 12 }, (_, i) =>
    createEmptyMonth(i),
  );
  const purchaseAnalyticsResult = Array.from({ length: 12 }, (_, i) =>
    createEmptyMonth(i),
  );
  const tradeAnalyticsResult = Array.from({ length: 12 }, (_, i) =>
    createEmptyMonth(i),
  );

  allLeadsForMatrix.forEach((lead: any) => {
    const monthIndex = dayjs(lead.createdAt).month();
    const targetArray =
      lead.type === ReferralType.BUY
        ? salesAnalyticsResult
        : [
              ReferralType.SELL,
              ReferralType.VALUATION,
              ReferralType.SELL_TRADE_USED,
            ].includes(lead.type)
          ? purchaseAnalyticsResult
          : tradeAnalyticsResult;

    const monthData = targetArray[monthIndex];
    let categoryKey: "SUCCESS" | "LOSE" | "FROZEN" | "REMAINING" = "REMAINING";
    if (categories.SUCCESS.includes(lead.status)) categoryKey = "SUCCESS";
    else if (categories.LOSE.includes(lead.status)) categoryKey = "LOSE";
    else if (categories.FROZEN.includes(lead.status)) categoryKey = "FROZEN";

    const inspectKey = (lead.inspectStatus ||
      "NOT_INSPECTED") as keyof InspectionMatrix;
    const urgencyKey = (lead.urgencyLevel || "COOL") as keyof UrgencyStats;

    monthData[categoryKey].total++;
    const inspectData = monthData[categoryKey][inspectKey] as UrgencyStats;
    inspectData.total++;
    inspectData[urgencyKey]++;

    monthData.trend[categoryKey]++;
    if (urgencyKey === "HOT") monthData.trend.HOT++;
  });

  return {
    role,
    isGlobal: isHighLevel,
    salesAnalytics: salesAnalyticsResult,
    purchaseAnalytics: purchaseAnalyticsResult,
    tradeAnalytics: tradeAnalyticsResult,
    interestedModelsByMonth: interestedModelsRaw.map((g: any) => ({
      modelName: modelMap.get(g.carModelId) || "Unknown",
      count: g._count,
    })),
    branches,
    newCarSalesByMonth: newCarSalesMonthlyRaw.map((g: any) => ({
      month: dayjs(g.date).month() + 1,
      totalNewCars: g._sum.totalCars || 0,
    })),
    totalNewCarsYear: totalNewCarsAgg._sum.totalCars || 0,
    newCarPerBranch: perBranchStats,
    stats: {
      sales: {
        total: totalSales,
        late: lateSalesLeads,
        performance: staffSalesPerformance,
      },
      purchase: {
        total: totalPurchased,
        late: latePurchaseLeads,
        performance: staffPurchasePerformance,
      },
      trade: {
        total: totalTrades,
        late: lateTradeLeads,
        performance: staffTradePerformance,
      },
      inventoryStatus,
      yearlyTotals: {
        system: {
          totalSales,
          totalPurchase: totalPurchased,
          totalTrade: totalTrades,
          totalNewCars: totalNewCarsAgg._sum.totalCars || 0,
        },
        perBranch: perBranchStats,
      },
      growthChart: salesAnalyticsResult.map((m, idx) => ({
        name: m.monthName,
        sales: m.trend.SUCCESS,
        purchase: purchaseAnalyticsResult[idx].trend.SUCCESS,
        trade: tradeAnalyticsResult[idx].trend.SUCCESS,
      })),
    },
  };
}

export async function getLateReportAction(filters: {
  fromDate?: Date;
  toDate?: Date;
  userId?: string;
  branchId?: string;
}) {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("Chưa đăng nhập");
  const whereClause: any = {
    isLate: true,
    createdAt: { gte: filters.fromDate, lte: filters.toDate },
  };

  if (auth.role === "ADMIN" || auth.isGlobalManager) {
    if (filters.branchId) whereClause.user = { branchId: filters.branchId };
  } else if (auth.role === "MANAGER") {
    whereClause.user = { branchId: auth.branchId };
  } else {
    whereClause.createdById = auth.id;
  }
  if (filters.userId) whereClause.createdById = filters.userId;

  return await db.leadActivity.findMany({
    where: whereClause,
    select: {
      id: true,
      lateMinutes: true,
      note: true,
      createdAt: true,
      customer: { select: { fullName: true, phone: true } },
      user: {
        select: {
          id: true,
          fullName: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── INTERFACE CHUNG CHO TẤT CẢ TAB ──
interface UrgencyStats {
  HOT: number;
  WARM: number;
  COOL: number;
  total: number;
}

interface InspectionMatrix {
  INSPECTED: UrgencyStats;
  APPOINTED: UrgencyStats;
  NOT_INSPECTED: UrgencyStats;
  total: number;
}

interface MonthlyAnalytics {
  monthIdx: number;
  monthName: string;
  SUCCESS: InspectionMatrix;
  LOSE: InspectionMatrix;
  FROZEN: InspectionMatrix;
  REMAINING: InspectionMatrix;
  trend: {
    SUCCESS: number;
    LOSE: number;
    FROZEN: number;
    REMAINING: number;
    HOT: number;
  };
}

interface TabReportData {
  analytics: MonthlyAnalytics[];
  stats: {
    totalCustomersYear: number;
    total: number;
    late: number;
    performance: Array<{ id: string; fullName: string | null; _count: any }>;
    interestedModels: {
      name: string;
      count: number;
    }[];
  };
}

// ── HÀM CHUNG XỬ LÝ MA TRẬN LEAD (TYPE-SAFE) ──
function processLeadMatrix(leads: any[]): MonthlyAnalytics[] {
  const categories = {
    SUCCESS: [LeadStatus.DEAL_DONE],
    LOSE: [LeadStatus.LOSE, LeadStatus.CANCELLED, LeadStatus.REJECTED_APPROVAL],
    FROZEN: [LeadStatus.FROZEN],
  };

  const createEmptyMatrix = (): InspectionMatrix => ({
    INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
    APPOINTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
    NOT_INSPECTED: { HOT: 0, WARM: 0, COOL: 0, total: 0 },
    total: 0,
  });

  const createEmptyMonth = (i: number): MonthlyAnalytics => ({
    monthIdx: i,
    monthName: `Tháng ${i + 1}`,
    SUCCESS: createEmptyMatrix(),
    LOSE: createEmptyMatrix(),
    FROZEN: createEmptyMatrix(),
    REMAINING: createEmptyMatrix(),
    trend: { SUCCESS: 0, LOSE: 0, FROZEN: 0, REMAINING: 0, HOT: 0 },
  });

  const analytics = Array.from({ length: 12 }, (_, i) => createEmptyMonth(i));

  leads.forEach((lead: any) => {
    const monthIndex = dayjs(lead.createdAt).month();
    const monthData = analytics[monthIndex];

    let categoryKey: keyof Pick<
      MonthlyAnalytics,
      "SUCCESS" | "LOSE" | "FROZEN" | "REMAINING"
    > = "REMAINING";
    if (categories.SUCCESS.includes(lead.status)) categoryKey = "SUCCESS";
    else if (categories.LOSE.includes(lead.status)) categoryKey = "LOSE";
    else if (categories.FROZEN.includes(lead.status)) categoryKey = "FROZEN";

    const inspectKey = (lead.inspectStatus ||
      "NOT_INSPECTED") as keyof InspectionMatrix;
    const urgencyKey = (lead.urgencyLevel || "COOL") as keyof UrgencyStats;

    monthData[categoryKey].total++;
    const inspectData = monthData[categoryKey][inspectKey];
    if (
      inspectData &&
      typeof inspectData === "object" &&
      "total" in inspectData
    ) {
      (inspectData as UrgencyStats).total++;
      (inspectData as UrgencyStats)[urgencyKey]++;
    }

    monthData.trend[categoryKey]++;
    if (urgencyKey === "HOT") monthData.trend.HOT++;
  });

  return analytics;
}

export async function getSalesReportAction(
  month?: number,
  year: number = 2026,
  selectedBranchId?: string,
  selectedUserId?: string,
): Promise<SalesReportResponse> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const authUser: AuthUser = {
    role: user.role,
    id: user.id,
    branchId: user.branchId,
    isGlobalManager: user.isGlobalManager,
  };

  const { timeWhere, fullYearWhere, branchFilter, userFilter } =
    getReportFilters(year, month, authUser, selectedBranchId, selectedUserId);

  const [
    totalSoldMonth,
    lateLeads,
    performanceRaw,
    leadsForStats,
    leadsForAnalytics,
    totalCustomersYear,
  ] = await Promise.all([
    // 1. Số xe bán được tháng chọn
    db.car.count({
      where: {
        status: "SOLD",
        ...timeWhere,
        ...branchFilter,
        contracts: { some: { type: "SALE" } },
      },
    }),
    // 2. Lead trễ tháng chọn
    db.leadActivity.count({
      where: {
        isLate: true,
        customer: { type: ReferralType.BUY, ...timeWhere, ...branchFilter },
      },
    }),
    // 3. Nhân sự xuất sắc (Top 5 nhân viên chốt xe tháng chọn)
    db.user.findMany({
      where: {
        ...branchFilter,
        role: { in: ["SALES_STAFF"] },
        active: true,
      },
      select: {
        fullName: true,
        _count: {
          select: { soldCars: { where: { status: "SOLD", ...timeWhere } } },
        },
      },
      orderBy: { soldCars: { _count: "desc" } },
      take: 5,
    }),
    // 4. Summary tháng chọn
    db.customer.findMany({
      where: {
        type: ReferralType.BUY,
        ...timeWhere,
        ...branchFilter,
        ...userFilter,
      },
      select: { status: true },
    }),
    // 5. Analytics 12 tháng (QUAN TRỌNG: Thêm carModelId vào select để hết lỗi TS)
    db.customer.findMany({
      where: {
        type: ReferralType.BUY,
        ...fullYearWhere,
        ...branchFilter,
        ...userFilter,
      },
      select: {
        status: true,
        inspectStatus: true,
        urgencyLevel: true,
        createdAt: true,
        carModelId: true, // Thêm dòng này để fix lỗi carModelId not exist
        carModel: { select: { name: true, grade: true } },
      },
    }),
    // 6. Tổng khách cả năm
    db.customer.count({
      where: {
        type: ReferralType.BUY,
        ...fullYearWhere,
        ...branchFilter,
        ...userFilter,
      },
    }),
  ]);

  // --- XỬ LÝ DÒNG XE QUAN TÂM (interestedModels) ---
  // Lọc lấy khách trong tháng chọn từ mảng leadsForAnalytics để thống kê model
  const startOfMonth = new Date(year, (month || 1) - 1, 1);
  const endOfMonth = new Date(year, month || 12, 0);

  const modelMap: Record<string, number> = {};
  leadsForAnalytics.forEach((lead) => {
    const isInsideMonth =
      lead.createdAt >= startOfMonth && lead.createdAt <= endOfMonth;
    if (isInsideMonth && lead.carModel) {
      const label = lead.carModel.grade
        ? `${lead.carModel.name} (${lead.carModel.grade})`
        : lead.carModel.name;
      modelMap[label] = (modelMap[label] || 0) + 1;
    }
  });

  const interestedModels = Object.entries(modelMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- CÁC LOGIC CÒN LẠI ---
  const analytics = processLeadMatrix(leadsForAnalytics);
  const LOSE_GROUP: LeadStatus[] = ["LOSE", "CANCELLED", "REJECTED_APPROVAL"];
  const monthlySummary = leadsForStats.reduce(
    (acc, lead) => {
      const status = lead.status as LeadStatus;
      if (status === "DEAL_DONE") acc.totalSuccess++;
      else if (LOSE_GROUP.includes(status)) acc.totalLost++;
      else if (status === "FROZEN") acc.totalFrozen++;
      else acc.totalActive++;
      return acc;
    },
    { totalActive: 0, totalSuccess: 0, totalFrozen: 0, totalLost: 0 },
  );

  return {
    analytics,
    stats: {
      totalCustomersYear,
      total: totalSoldMonth,
      late: lateLeads,
      // Format lại top nhân sự
      performance: performanceRaw.map((p) => ({
        fullName: p.fullName,
        count: p._count.soldCars,
      })),
      interestedModels, // Đã có đủ dữ liệu kèm Grade
    },
    monthlySummary,
  };
}

export async function getPurchaseReportAction(
  month?: number,
  year?: number,
  selectedBranchId?: string,
  selectedUserId?: string,
): Promise<PurchaseReportResponse> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const authUser: AuthUser = {
    role: user.role,
    id: user.id,
    branchId: user.branchId,
    isGlobalManager: user.isGlobalManager,
  };

  const { timeWhere, fullYearWhere, branchFilter, userFilter } =
    getReportFilters(year, month, authUser, selectedBranchId, selectedUserId);

  const purchaseTypes = [
    ReferralType.SELL,
    ReferralType.VALUATION,
    ReferralType.SELL_TRADE_USED,
  ];

  const [
    total,
    lateLeads,
    performanceRaw,
    leadsForAnalytics,
    interestedModelsRaw,
    totalCustomersYear,
  ] = await Promise.all([
    db.car.count({
      where: { purchasedAt: { not: null }, ...timeWhere, ...branchFilter },
    }),
    db.leadActivity.count({
      where: {
        isLate: true,
        customer: {
          type: { in: purchaseTypes },
          ...timeWhere,
          ...branchFilter,
        },
      },
    }),
    db.user.findMany({
      where: {
        ...branchFilter,
        role: { in: ["PURCHASE_STAFF", "APPRAISER"] },
        active: true,
      },
      select: {
        id: true,
        fullName: true,
        _count: { select: { purchases: { where: timeWhere } } },
      },
      orderBy: { purchases: { _count: "desc" } },
      take: 5,
    }),
    db.customer.findMany({
      where: {
        type: { in: purchaseTypes },
        ...fullYearWhere,
        ...branchFilter,
        ...userFilter,
      },
      select: {
        status: true,
        inspectStatus: true,
        urgencyLevel: true,
        createdAt: true,
      },
    }),
    db.customer.groupBy({
      by: ["carModelId"],
      where: {
        type: { in: purchaseTypes },
        carModelId: { not: null },
        ...timeWhere,
        ...branchFilter,
      },
      _count: true,
    }),
    db.customer.count({
      where: {
        type: { in: purchaseTypes },
        ...fullYearWhere,
        ...branchFilter,
        ...userFilter,
      },
    }),
  ]);

  // Xử lý Map tên Model
  const modelIds = interestedModelsRaw.map((m) => m.carModelId as string);
  const models = await db.carModel.findMany({
    where: { id: { in: modelIds } },
    select: { id: true, name: true },
  });
  const modelMap = new Map(models.map((m) => [m.id, m.name]));

  return {
    analytics: processLeadMatrix(leadsForAnalytics),
    stats: {
      totalCustomersYear,
      total,
      late: lateLeads,
      // LỖI 1: Phải trả về đúng cấu trúc có chứa _count nếu Interface yêu cầu thế
      // Hoặc sửa Interface (khuyên dùng cách sửa Interface ở mục 2)
      performance: performanceRaw.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        _count: { purchases: p._count.purchases }, // Trả về đúng property _count
      })),
      interestedModels: interestedModelsRaw
        .map((g) => ({
          name: modelMap.get(g.carModelId!) || "Khác", // Sửa từ name -> modelName
          count: g._count,
        }))
        .sort((a, b) => b.count - a.count),
    },
    // LỖI 2: Interface yêu cầu 'modelName', không phải 'name'
    interestedModels: interestedModelsRaw
      .map((g) => ({
        name: modelMap.get(g.carModelId!) || "Khác", // Sửa từ name -> modelName
        count: g._count,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getTradeReportAction(
  month?: number,
  year?: number,
  selectedBranchId?: string,
): Promise<TradeReportResponse> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const authUser: AuthUser = {
    role: user.role,
    id: user.id,
    branchId: user.branchId,
    isGlobalManager: user.isGlobalManager,
  };

  // 1. Lấy filter thời gian
  const { timeWhere, fullYearWhere, branchFilter } = getReportFilters(
    year,
    month,
    authUser,
    selectedBranchId,
  );

  // 2. Truy vấn song song tất cả các bảng liên quan
  const [
    tradeLeadsFullYear, // Khách đổi xe (Cả năm)
    inboundCarsFullYear, // Xe nhập mới (Cả năm - cho biểu đồ)
    inboundCarsStats, // Xe nhập mới (Theo tháng chọn - cho Stats)
    totalCustomersYear, // Tổng khách đổi xe cả năm
    interestedModelsRaw, // Model khách quan tâm
  ] = await Promise.all([
    // Lấy Leads đổi xe
    db.customer.findMany({
      where: {
        type: ReferralType.SELL_TRADE_NEW,
        ...fullYearWhere,
        ...branchFilter,
      },
      select: {
        status: true,
        createdAt: true,
        inspectStatus: true,
        urgencyLevel: true,
      },
    }),
    // Lấy dữ liệu xe nhập mới CẢ NĂM để vẽ biểu đồ so sánh
    db.dailyCarInbound.groupBy({
      by: ["date"],
      where: {
        date: fullYearWhere.createdAt, // createdAt ở đây là filter range từ startOf('year') đến endOf('year')
        ...branchFilter,
      },
      _sum: { totalCars: true },
    }),
    // Lấy tổng xe nhập mới theo THỜI GIAN CHỌN (Tháng hoặc Năm cụ thể)
    db.dailyCarInbound.aggregate({
      where: {
        date: timeWhere.createdAt,
        ...branchFilter,
      },
      _sum: { totalCars: true },
    }),
    db.customer.count({
      where: {
        type: ReferralType.SELL_TRADE_NEW,
        ...fullYearWhere,
        ...branchFilter,
      },
    }),
    db.customer.groupBy({
      by: ["carModelId"],
      where: {
        type: ReferralType.SELL_TRADE_NEW,
        carModelId: { not: null },
        ...timeWhere,
        ...branchFilter,
      },
      _count: true,
    }),
  ]);

  // 3. Xử lý Map tên Model xe
  const modelIds = interestedModelsRaw.map((m) => m.carModelId as string);
  const models = await db.carModel.findMany({
    where: { id: { in: modelIds } },
    select: { id: true, name: true },
  });
  const modelMap = new Map(models.map((m) => [m.id, m.name]));

  // 4. Xử lý ma trận Analytics 12 tháng
  const analytics = processLeadMatrix(tradeLeadsFullYear);

  // 5. Xử lý BIỂU ĐỒ SO SÁNH (Trade Success vs Inbound) - 12 tháng
  const inboundComparison = Array.from({ length: 12 }, (_, i) => {
    // Số ca đổi xe thành công trong tháng i
    const monthTradeSuccess = tradeLeadsFullYear.filter(
      (l) =>
        dayjs(l.createdAt).month() === i && l.status === LeadStatus.DEAL_DONE,
    ).length;

    // Tổng xe nhập mới thực tế trong tháng i (từ bảng DailyCarInbound)
    const monthInbound = inboundCarsFullYear
      .filter((c) => dayjs(c.date).month() === i)
      .reduce((sum, curr) => sum + (curr._sum.totalCars || 0), 0);

    return {
      month: i + 1,
      tradeSuccess: monthTradeSuccess,
      newCarsInbound: monthInbound,
    };
  });

  // 6. Tính toán các con số tổng quát (Stats)
  // Lọc list leads theo tháng được chọn để hiện con số "Tổng đổi xe"
  const statsLeads = month
    ? tradeLeadsFullYear.filter((l) => dayjs(l.createdAt).month() === month - 1)
    : tradeLeadsFullYear;

  return {
    analytics,
    stats: {
      totalCustomersYear,
      total: statsLeads.filter((l) => l.status === LeadStatus.DEAL_DONE).length,
      late: 0,
      performance: [],
      // Đưa interestedModels vào trong stats theo Interface chung
      interestedModels: interestedModelsRaw
        .map((g) => ({
          name: modelMap.get(g.carModelId!) || "Khác",
          count: g._count,
        }))
        .sort((a, b) => b.count - a.count),
    },
    inboundComparison,
    // Con số này hiển thị tổng số xe nhập mới trong kỳ báo cáo (tháng hoặc năm chọn)
    totalNewCarsYear: inboundCarsStats._sum.totalCars || 0,
  };
}

export async function getMyPerformanceReport(period: "day" | "month" | "year") {
  try {
    const auth = await getCurrentUser();
    if (!auth)
      return { success: false, message: "Không tìm thấy phiên đăng nhập" };

    const myId = auth.id;
    const now = dayjs();
    const start = now.startOf(period).toDate();
    const end = now.endOf(period).toDate();

    // 1. Lấy toàn bộ khách hàng được giao trong kỳ
    const customers = await db.customer.findMany({
      where: {
        assignedToId: myId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        leadCar: true,
        carModel: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Thống kê theo UrgencyLevel (Hot/Warm/Cool)
    const urgencyStats = {
      HOT: customers.filter((c) => c.urgencyLevel === "HOT").length,
      WARM: customers.filter((c) => c.urgencyLevel === "WARM").length,
      COOL: customers.filter((c) => c.urgencyLevel === "COOL").length,
    };

    // 3. Thống kê theo Tình trạng xem xe (InspectStatus)
    const inspectStats = {
      INSPECTED: customers.filter((c) => c.inspectStatus === "INSPECTED")
        .length,
      NOT_INSPECTED: customers.filter(
        (c) => c.inspectStatus === "NOT_INSPECTED",
      ).length,
      APPOINTED: customers.filter((c) => c.inspectStatus === "APPOINTED")
        .length,
    };

    // 4. Dữ liệu biểu đồ tăng trưởng (Theo tháng của năm hiện tại)
    const yearStart = now.startOf("year").toDate();
    const monthlyData = await db.customer.groupBy({
      by: ["createdAt"],
      where: {
        assignedToId: myId,
        createdAt: { gte: yearStart },
      },
      _count: { id: true },
    });

    // Gom nhóm dữ liệu theo tháng cho biểu đồ
    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: `T${i + 1}`,
      leads: 0,
    }));

    monthlyData.forEach((item) => {
      const m = dayjs(item.createdAt).month();
      chartData[m].leads += item._count.id;
    });

    // 5. Thống kê tài chính & Task
    const dealsDone = customers.filter((c) => c.status === "DEAL_DONE");
    const totalRevenue = dealsDone.reduce(
      (sum, curr) => sum + Number(curr.leadCar?.finalPrice || 0),
      0,
    );

    const tasks = await db.task.findMany({
      where: { assigneeId: myId, scheduledAt: { gte: start, lte: end } },
    });
    const lateTasks = tasks.filter(
      (t) => t.isLate || t.status === "EXPIRED",
    ).length;

    return {
      success: true,
      summary: {
        totalLeads: customers.length,
        successDeals: dealsDone.length,
        totalRevenue,
        lateTasks,
        onTimeRate:
          tasks.length > 0
            ? Math.round(((tasks.length - lateTasks) / tasks.length) * 100)
            : 100,
      },
      urgencyStats,
      inspectStats,
      chartData,
      customerList: customers.slice(0, 10), // Trả về 10 khách gần nhất
      recentActivities: await db.leadActivity.findMany({
        where: { createdById: myId },
        include: { customer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    };
  } catch (error) {
    return { success: false, message: "Lỗi Server" };
  }
}

export async function getDetailedPerformance(period: "day" | "month" | "year") {
  try {
    const auth = await getCurrentUser();
    if (!auth) return { success: false, message: "Unauthorized" };

    const myId = auth.id;
    const now = dayjs();
    const start = now.startOf(period).toDate();
    const end = now.endOf(period).toDate();

    // 1. Fetch khách hàng và các quan hệ liên quan
    const customers = await db.customer.findMany({
      where: { assignedToId: myId, createdAt: { gte: start, lte: end } },
      include: { leadCar: true, carModel: true },
    });

    // 2. Thống kê theo Nhiệt độ (UrgencyType)
    const urgency = {
      hot: customers.filter((c) => c.urgencyLevel === "HOT").length,
      warm: customers.filter((c) => c.urgencyLevel === "WARM").length,
      cool: customers.filter((c) => c.urgencyLevel === "COOL").length,
    };

    // 3. Thống kê Xem xe (InspectStatus)
    const inspection = {
      done: customers.filter((c) => c.inspectStatus === "INSPECTED").length,
      pending: customers.filter((c) => c.inspectStatus === "APPOINTED").length,
      none: customers.filter((c) => c.inspectStatus === "NOT_INSPECTED").length,
    };

    // 4. Doanh thu & Tỷ lệ chốt
    const deals = customers.filter((c) => c.status === "DEAL_DONE");
    const revenue = deals.reduce(
      (sum, c) => sum + Number(c.leadCar?.finalPrice || 0),
      0,
    );

    // 5. Dữ liệu biểu đồ tháng (Dùng cho Chart)
    const chartData = await Promise.all(
      Array.from({ length: 6 }).map(async (_, i) => {
        const d = dayjs().subtract(i, "month");
        const count = await db.customer.count({
          where: {
            assignedToId: myId,
            createdAt: {
              gte: d.startOf("month").toDate(),
              lte: d.endOf("month").toDate(),
            },
          },
        });
        return { name: d.format("MMM"), leads: count };
      }),
    ).then((res) => res.reverse());

    return {
      success: true,
      summary: {
        totalLeads: customers.length,
        revenue,
        dealCount: deals.length,
        onTimeRate: 95, // Giả định từ logic Task của bạn
      },
      urgency,
      inspection,
      chartData,
      rawLeads: customers.slice(0, 10), // Gửi 10 khách gần nhất
    };
  } catch (e) {
    return { success: false, message: "Lỗi Server" };
  }
}

// src/actions/report-actions.ts

export async function getAdvancedStaffReport(filters: {
  period: "day" | "month" | "year" | "custom";
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
}) {
  try {
    const auth = await getCurrentUser();
    if (!auth) return { success: false, message: "Unauthorized" };

    const myId = auth.id;
    const now = dayjs();

    // 1. Xử lý thời gian
    let start = now.startOf(filters.period as any).toDate();
    let end = now.endOf(filters.period as any).toDate();

    if (filters.period === "custom" && filters.startDate && filters.endDate) {
      start = dayjs(filters.startDate).startOf("day").toDate();
      end = dayjs(filters.endDate).endOf("day").toDate();
    }

    // 2. Fetch dữ liệu khách hàng chính (Đã XÓA orderBy để cứu RAM MySQL)
    const customers = await db.customer.findMany({
      where: {
        assignedToId: myId,
        createdAt: { gte: start, lte: end },
        ...(filters.branchId && { branchId: filters.branchId }),
      },
      include: {
        carModel: true,
        leadCar: true,
      },
      // ❌ XÓA DÒNG orderBy: { createdAt: "desc" } Ở ĐÂY
    });

    // 3. Phân tích Phễu Khách Hàng (Tập trung vào Volume)
    const funnel = {
      total: customers.length,
      new: customers.filter((c) => c.status === "NEW").length,
      contacted: customers.filter(
        (c) => c.status !== "NEW" && c.status !== "FROZEN",
      ).length,
      inspected: customers.filter((c) => c.inspectStatus === "INSPECTED")
        .length,
      deals: customers.filter((c) => c.status === "DEAL_DONE").length,
    };

    // 4. Phân tích chất lượng (Nhiệt độ)
    const leadQuality = {
      hot: customers.filter((c) => c.urgencyLevel === "HOT").length,
      warm: customers.filter((c) => c.urgencyLevel === "WARM").length,
      cool: customers.filter((c) => c.urgencyLevel === "COOL").length,
      frozen: customers.filter((c) => c.status === "FROZEN").length,
      late: customers.filter((c) => c.isLate).length,
    };

    // 5. Thống kê theo nguồn khách (Source)
    const sourceStats = customers.reduce((acc: any, curr) => {
      const source = curr.type || "Chưa phân loại";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // 6. Thống kê Task & Hiệu suất làm việc
    const tasks = await db.task.findMany({
      where: {
        assigneeId: myId,
        scheduledAt: { gte: start, lte: end },
      },
    });

    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      pending: tasks.filter((t) => t.status === "PENDING").length,
      late: tasks.filter((t) => t.isLate).length,
    };

    // 7. Trend: Lấy số lượng khách 6 tháng gần nhất
    const trendData = await Promise.all(
      Array.from({ length: 6 }).map(async (_, i) => {
        const d = dayjs().subtract(i, "month");
        const count = await db.customer.count({
          where: {
            assignedToId: myId,
            createdAt: {
              gte: d.startOf("month").toDate(),
              lte: d.endOf("month").toDate(),
            },
          },
        });
        return { month: d.format("MM/YYYY"), count };
      }),
    );

    // 🔥 Tối ưu bằng JS: Sắp xếp mảng khách hàng trực tiếp trên RAM của Node.js
    const sortedCustomersForTable = [...customers].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Chuẩn bị object report cuối cùng
    const reportData = {
      funnel,
      leadQuality,
      sourceStats: Object.entries(sourceStats).map(([name, value]) => ({
        name,
        value,
      })),
      taskStats,
      trend: trendData.reverse(),
      rawLeads: sortedCustomersForTable.slice(0, 50), // Lấy 50 khách mới nhất sau khi sort bằng JS
    };

    return {
      success: true,
      data: serializeData(reportData),
    };
  } catch (error) {
    console.error("REPORT_ERROR:", error);
    return { success: false, message: "Không thể tải báo cáo" };
  }
}
