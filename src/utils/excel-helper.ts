/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "@/lib/dayjs";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Hàm helper chuyển đổi trạng thái sang Tiếng Việt
const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    NEW: "Mới",
    CONTACTED: "Đã liên hệ",
    FOLLOW_UP: "Đang chăm sóc",
    DEAL_DONE: "Thành công",
    LOSE: "LOST",
    FROZEN: "Đóng băng",
    CANCELLED: "Đã hủy",
    INSPECTED: "Đã xem xe",
    NOT_INSPECTED: "Chưa xem xe",
    APPOINTED: "Hẹn xem xe",
    ASSIGNED: "Đã phân bổ",
    SELL: "Thu mua",
    BUY: "Bán hàng",
    SELL_TRADE_NEW: "Trade in",
    SELL_TRADE_USED: "Thu mua",
    PENDING_DEAL_APPROVAL: "Chờ phê duyệt",
    HOT: "HOT",
    WARM: "WARM",
    COOL: "COOL",
  };
  return map[status] || status;
};

export const translateSource = (source: string) => {
  const map: Record<string, string> = {
    // --- NGUỒN CÔNG TY (DLr) ---
    ZALO_OA: "Zalo OA (Công ty)",
    FACEBOOK_ADS: "Fanpage công ty",
    LEAD_TMV: "Lead TMV",
    WEBSITE_COMPANY: "Website công ty",
    TIKTOK_COMPANY: "Tiktok công ty",
    YOUTUBE_COMPANY: "Youtube công ty",
    GOOGLE_MAPS: "Google Maps",
    SHROOM: "Showroom",
    EVENT: "Sự kiện",

    // --- NGUỒN CÁ NHÂN KHAI THÁC ---
    ZALO_PERSONAL: "Zalo cá nhân",
    FACEBOOK_PERSONAL: "Fanpage cá nhân",
    TIKTOK_PERSONAL: "Tiktok cá nhân",
    YOUTUBE_PERSONAL: "Youtube cá nhân",
    WEBSITE_PERSONAL: "Website cá nhân",
    REFERRAL: "Khách cũ",
    BROKER: "MÔI GIỚI",
    COMMUNITY: "Diễn đàn / Hội nhóm",
    CHOTOT: "Chợ Tốt (Cá nhân)",

    // --- NỘI BỘ & KHÁC ---
    HOTLINE: "Hotline",
    WALK_IN: "Khách vãng lai",
    INTERNAL: "Nội bộ hệ thống",
    OTHER: "Nguồn khác",
  };

  return map[source] || source;
};

// Định dạng số ngăn cách dấu chấm: #,##0 (Excel sẽ tự động đổi dấu phẩy thành dấu chấm theo cấu hình vùng của máy tính người dùng)

const NUMBER_FORMAT = "#,##0";

export const handleExportFullCustomerExcel = async (data: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const today = dayjs();

  // --- 1. ĐỊNH NGHĨA STYLE CHUẨN CORPORATE ---
  const styles = {
    header: {
      font: { bold: true, color: { argb: "FFFFFF" }, size: 10 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "203764" } }, // Xanh Navy đậm
      alignment: { vertical: "middle", horizontal: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "double" },
        right: { style: "thin" },
      },
    } as ExcelJS.Style,
    cell: {
      alignment: {
        vertical: "middle",
        horizontal: "left",
        wrapText: false,
        indent: 1,
      },
      font: { size: 10, name: "Arial" },
      border: {
        top: { style: "thin", color: { argb: "BFBFBF" } },
        left: { style: "thin", color: { argb: "BFBFBF" } },
        bottom: { style: "thin", color: { argb: "BFBFBF" } },
        right: { style: "thin", color: { argb: "BFBFBF" } },
      },
    } as ExcelJS.Style,
    number: {
      numFmt: NUMBER_FORMAT,
      alignment: { horizontal: "right", indent: 1 },
    },
  };

  // --- 2. SHEET 1: TOÀN BỘ HỒ SƠ THU MUA / ĐỔI XE ---
  const sheet1 = workbook.addWorksheet("BAO CAO THU MUA");
  const sellLeads = data.filter((c) => c.type !== "BUY");

  // Định nghĩa cột siêu chi tiết (30+ trường)
  sheet1.columns = [
    { header: "STT", key: "stt", width: 5 },
    { header: "PHÂN LOẠI", key: "demand", width: 15 },
    { header: "TRẠNG THÁI", key: "status", width: 15 },
    { header: "LÝ DO ĐÓNG BĂNG/LOST", key: "reasonDetail", width: 15 },
    { header: "MỨC ĐỘ ƯU TIÊN", key: "level", width: 15 },
    { header: "CHI NHÁNH", key: "branch", width: 20 },

    // Nhóm: Nhân sự & Nguồn
    { header: "NV TIẾP NHẬN", key: "staff", width: 20 },
    { header: "NGÀY NHẬN", key: "dateIn", width: 12 },
    { header: "GIỜ NHẬN", key: "timeIn", width: 10 },
    { header: "NGƯỜI GIỚI THIỆU", key: "refStaff", width: 20 },
    { header: "BỘ PHẬN GT", key: "source", width: 20 },
    { header: "NGUỒN CHI TIẾT", key: "sourceDetail", width: 25 },

    // Nhóm: Khách hàng
    { header: "TÊN KHÁCH HÀNG", key: "name", width: 25 },
    { header: "SỐ ĐIỆN THOẠI", key: "phone", width: 15 },
    { header: "TỈNH/THÀNH", key: "province", width: 15 },
    { header: "ĐỊA CHỈ CHI TIẾT", key: "address", width: 35 },

    // Nhóm: Thông tin Xe
    { header: "MODEL XE", key: "model", width: 20 },
    { header: "PHIÊN BẢN (GRADE)", key: "grade", width: 15 },
    { header: "MODEL MUỐN ĐỔI", key: "modelTrade", width: 20 },
    { header: "PHIÊN BẢN MUỐN ĐỔI", key: "gradeTradee", width: 15 },
    { header: "NĂM SẢN XUẤT", key: "year", width: 10 },
    { header: "BIỂN SỐ", key: "plate", width: 15 },
    { header: "ODO (KM)", key: "odo", width: 12 },
    { header: "MÀU XE", key: "color", width: 12 },

    // Nhóm: Giám định & Giá
    { header: "GIÁ KH KỲ VỌNG", key: "expPrice", width: 15 },
    { header: "GIÁ ĐỊNH GIÁ (T-SURE)", key: "tsurePrice", width: 18 },
    { header: "NV GIÁM ĐỊNH", key: "inspector", width: 20 },
    { header: "NGÀY GIÁM ĐỊNH", key: "inspectorDate", width: 20 },
    { header: "TÌNH TRẠNG XEM XE", key: "inspectStatus", width: 18 },
    { header: "ĐỊA ĐIỂM XEM XE", key: "inspectLoc", width: 20 },

    // Nhóm: Chăm sóc & Lịch sử
    { header: "LẦN LH GẦN NHẤT", key: "lastDate", width: 15 },
    { header: "KẾT QUẢ CHI TIẾT", key: "lastRes", width: 40 },
    { header: "TỔNG SỐ LẦN LH", key: "count", width: 12 },
    { header: "HẸN GỌI LẠI", key: "nextDate", width: 15 },
    { header: "NỘI DUNG HẸN", key: "nextNote", width: 30 },
    { header: "GHI CHÚ HỆ THỐNG", key: "internalNote", width: 40 },
  ];

  sellLeads.forEach((item, index) => {
    const reasonDetail =
      item.status === "FROZEN"
        ? item.frozenReason
        : item.status === "LOSE" || item.status === "CANCELLED"
          ? item.lostReason
          : "";

    const isFuture =
      item.nextContactAt && dayjs(item.nextContactAt).isAfter(today);

    const row = sheet1.addRow({
      stt: index + 1,
      demand: translateStatus(item.type),
      status: translateStatus(item.status),
      reasonDetail: reasonDetail || "",
      level: translateStatus(item.urgencyLevel),
      branch: item.branch.name || "Toyota Bình Dương",
      staff: item.assignedTo?.fullName,
      dateIn: dayjs(item.createdAt).format("DD/MM/YYYY"),
      timeIn: dayjs(item.createdAt).format("HH:mm"),
      refStaff: item.referrer?.fullName,
      source: item.referrer?.department?.name,
      sourceDetail: translateSource(item.source),
      name: item.fullName.toUpperCase(),
      phone: item.phone,
      province: item.province,
      address: item.address,
      model: item.carModel?.name || "N/A",
      grade: item.carModel?.grade || "N/A",
      gradeTradee: item.tradeInModel?.grade,
      modelTrade: item.tradeInModel?.name,

      year: item.leadCar?.year || item.carYear,
      plate: item.leadCar?.licensePlate || item.licensePlate,
      odo: item.leadCar?.odo ? Number(item.leadCar.odo) : null,
      color: item.leadCar?.color || "---",
      expPrice: Number(item.leadCar?.expectedPrice || item.expectedPrice || 0),
      tsurePrice: Number(item.leadCar?.tSurePrice || 0),
      inspector: item.inspectorRef?.fullName,
      inspectorDate: item.inspectDoneDate
        ? dayjs(item.inspectDoneDate).format("DD/MM/YYYY")
        : "",
      inspectStatus: translateStatus(item.inspectStatus),
      inspectLoc: item.inspectLocation || "---",
      lastDate: item.lastContactAt
        ? dayjs(item.lastContactAt).format("DD/MM/YYYY")
        : "",
      lastRes: item.lastContactResult,
      count: item.contactCount || 0,
      nextDate: isFuture
        ? dayjs(item.nextContactAt).format("DD/MM/YYYY")
        : dayjs(item.nextContactAt).format("DD/MM/YYYY") + " (Chưa liên hệ)",
      nextNote: isFuture
        ? item.nextContactNote
        : item.nextContactNote + " (Chưa liên hệ)",
      internalNote: item.note,
    });

    // Format tiền tệ & ODO cho từng dòng
    ["odo", "expPrice", "tsurePrice"].forEach((k) => {
      const cell = row.getCell(k);
      cell.numFmt = NUMBER_FORMAT;
      cell.alignment = { horizontal: "right" };
    });
  });

  // --- SHEET 2: CHI TIẾT QUẢN LÝ BÁN HÀNG (SALES LEAD) ---
  const sheet2 = workbook.addWorksheet("BAO CAO BAN HANG");
  const buyLeads = data.filter((c) => c.type === "BUY");

  sheet2.columns = [
    { header: "STT", key: "stt", width: 5 },
    { header: "PHÂN LOẠI KH", key: "level", width: 15 }, // Khách nóng, ấm, lạnh
    { header: "TRẠNG THÁI", key: "status", width: 15 },
    { header: "LÝ DO ĐÓNG BĂNG/LOST", key: "reasonDetail", width: 15 },
    { header: "CHI NHÁNH", key: "branch", width: 20 },

    // Nhóm: Nhân sự & Nguồn
    { header: "NV TIẾP NHẬN", key: "staff", width: 20 },
    { header: "NGÀY NHẬN", key: "dateIn", width: 12 },
    { header: "GIỜ NHẬN", key: "timeIn", width: 10 },
    { header: "NGƯỜI GIỚI THIỆU", key: "refStaff", width: 20 },
    { header: "BỘ PHẬN GT", key: "source", width: 20 },
    { header: "NGUỒN CHI TIẾT", key: "sourceDetail", width: 25 },

    // Nhóm: Khách hàng
    { header: "TÊN KHÁCH HÀNG", key: "name", width: 25 },
    { header: "SỐ ĐIỆN THOẠI", key: "phone", width: 15 },
    { header: "TỈNH/THÀNH", key: "province", width: 15 },
    { header: "ĐỊA CHỈ", key: "address", width: 35 },
    { header: "NGÀY XEM XE", key: "dateViewCar", width: 35 },

    // Nhóm: Nhu cầu xe (Rất quan trọng)
    { header: "MODEL QUAN TÂM", key: "model", width: 20 },
    { header: "PHIÊN BẢN", key: "grade", width: 15 },
    { header: "NĂM SẢN XUẤT", key: "year", width: 15 },
    { header: "MÀU XE", key: "color", width: 15 },

    // Nhóm: Chăm sóc khách hàng
    { header: "LẦN LH GẦN NHẤT", key: "lastDate", width: 12 },
    { header: "KẾT QUẢ LIÊN HỆ", key: "lastRes", width: 40 },
    { header: "TỔNG SỐ LẦN LH", key: "count", width: 12 },
    { header: "HẸN GỌI LẠI/GẶP", key: "nextDate", width: 15 },
    { header: "NỘI DUNG HẸN", key: "nextNote", width: 35 },
    { header: "GHI CHÚ NỘI BỘ", key: "note", width: 40 },
  ];

  buyLeads.forEach((item, index) => {
    const isFuture =
      item.nextContactAt && dayjs(item.nextContactAt).isAfter(today);
    const reasonDetail =
      item.status === "FROZEN"
        ? item.frozenReason
        : item.status === "LOSE" || item.status === "CANCELLED"
          ? item.lostReason
          : "";
    const row = sheet2.addRow({
      stt: index + 1,
      level: translateStatus(item.urgencyLevel),
      status: translateStatus(item.status),
      reasonDetail: reasonDetail || "",
      branch: item.branch.name || "Toyota Bình Dương",
      staff: item.assignedTo?.fullName,
      dateIn: dayjs(item.createdAt).format("DD/MM/YYYY"),
      source: item.sourceName || item.referrer?.department?.name || "Trực tiếp",
      sourceDetail: translateSource(item.source),
      campaign: item.campaignName || "---",
      name: item.fullName.toUpperCase(),
      phone: item.phone,
      province: item.province,
      address: item.address,
      dateViewCar: dayjs(item.dateViewCar).format("DD/MM/YYYY") ?? "-",
      refStaff: item.referrer?.fullName,
      model: item.carModel?.modelName || "---",
      grade: item.carModel?.grade || "---",
      year: item.leadCar?.year || "---",
      color: item.leadCar?.color || "---",
      purpose: item.usagePurpose || "---",
      testDrive: item.hasTestDrive ? "Đã lái thử" : "Chưa",
      budget: item.budget ? Number(item.budget) : null,
      payment: item.paymentMethod === "INSTALLMENT" ? "Trả góp" : "Tiền mặt",
      bank: item.bankName || "---",
      tradeIn: item.hasTradeIn ? "Có nhu cầu đổi xe" : "Không",
      lastDate: item.lastContactAt
        ? dayjs(item.lastContactAt).format("DD/MM/YYYY")
        : "",
      timeIn: dayjs(item.createdAt).format("HH:mm"),
      lastRes: item.lastContactResult,
      count: item.contactCount || 0,
      nextDate: isFuture
        ? dayjs(item.nextContactAt).format("DD/MM/YYYY")
        : dayjs(item.nextContactAt).format("DD/MM/YYYY") + " (Chưa liên hệ)",
      nextNote: isFuture
        ? item.nextContactNote
        : item.nextContactNote + " (Chưa liên hệ)",
      note: item.note,
    });

    // Định dạng số cho cột Ngân sách
  });
  // --- 4. CÔNG ĐOẠN "LÀM ĐẸP" CUỐI CÙNG (FINAL TOUCH) ---
  [sheet1, sheet2].forEach((s) => {
    // Độ cao header và áp dụng style
    s.getRow(1).height = 40;
    s.getRow(1).eachCell((c) => {
      c.style = styles.header;
    });

    // Định dạng toàn bộ các dòng dữ liệu
    s.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.height = 25;
      row.eachCell((cell) => {
        cell.style = { ...styles.cell };
        // Zebra stripes (Dòng kẻ xen kẽ)
        if (rowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }
      });

      // Định dạng màu cho trạng thái quan trọng
      const statusCell = row.getCell("status");
      if (statusCell.value === "Chốt đơn")
        statusCell.font = { color: { argb: "008000" }, bold: true };
      if (statusCell.value === "Đóng băng")
        statusCell.font = { color: { argb: "FF0000" } };
    });

    // Cố định dòng tiêu đề
    s.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

    // Thêm bộ lọc tự động (Auto Filter)
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: s.columnCount },
    };
  });

  // --- 5. XUẤT FILE ---
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `CRM_FULL_REPORT_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
  saveAs(new Blob([buffer]), filename);
};
export const handleExportFullCustomerExcelManager = async (data: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const today = dayjs();
  const NUMBER_FORMAT = "#,##0";

  // --- 1. ĐỊNH NGHĨA STYLE ---
  const styles = {
    header: {
      font: { bold: true, color: { argb: "FFFFFF" }, size: 10 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "203764" } },
      alignment: { vertical: "middle", horizontal: "center", wrapText: true },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    } as ExcelJS.Style,
    cell: {
      alignment: { vertical: "middle", horizontal: "left", wrapText: true },
      font: { size: 10 },
      border: {
        top: { style: "thin", color: { argb: "D9D9D9" } },
        left: { style: "thin", color: { argb: "D9D9D9" } },
        bottom: { style: "thin", color: { argb: "D9D9D9" } },
        right: { style: "thin", color: { argb: "D9D9D9" } },
      },
    } as ExcelJS.Style,
  };

  // --- 2. SHEET 1: THU MUA ---
  const sheet1 = workbook.addWorksheet("KH Thu Mua");
  const sellLeads = data.filter((c) => c.type !== "BUY");

  sheet1.columns = [
    { header: "CHI NHÁNH", key: "branch", width: 20 },
    { header: "Nhu cầu khách hàng", key: "demand", width: 15 },
    { header: "NVTM Tiếp nhận", key: "staff", width: 20 },
    { header: "Ngày nhận thông tin", key: "dateIn", width: 15 },
    { header: "Giờ nhận thông tin", key: "timeIn", width: 12 },
    { header: "Nhân viên giới thiệu", key: "refStaff", width: 20 },
    { header: "Nguồn giới thiệu", key: "source", width: 25 },
    { header: "Nguồn chi tiết", key: "sourceDetail", width: 25 },

    { header: "Tên khách hàng", key: "name", width: 25 },
    { header: "Đánh giá trạng thái", key: "level", width: 15 },
    { header: "Tình trạng hồ sơ", key: "status", width: 15 },
    { header: "Lý do Đóng băng/LOST", key: "reasonDetail", width: 15 },
    { header: "Địa chỉ", key: "address", width: 30 },
    { header: "Tỉnh", key: "province", width: 15 },
    { header: "Model", key: "model", width: 15 },
    { header: "Phiên bản", key: "grade", width: 15 },
    { header: "Model muốn đổi", key: "modelTrade", width: 20 },
    { header: "Phiên bản muốn đổi", key: "gradeTradee", width: 15 },
    { header: "Màu xe", key: "color", width: 15 },
    { header: "Năm SX", key: "year", width: 10 },
    { header: "Số km (ODO)", key: "odo", width: 12 },
    { header: "NV Giám định", key: "inspector", width: 20 },
    { header: "Ngày Giám định", key: "inspectorDate", width: 20 },
    { header: "Tình trạng xem xe", key: "inspectStatus", width: 15 },
    { header: "Giá T-SURE", key: "tsurePrice", width: 15 },
    { header: "Giá bán KH", key: "expPrice", width: 15 },
    { header: "Ngày liên hệ gần nhất", key: "lastDate", width: 15 },
    { header: "Kết quả LH gần nhất", key: "lastRes", width: 30 },
    { header: "Số lần LH", key: "count", width: 10 },
    { header: "Ngày liên hệ tiếp theo", key: "nextDate", width: 15 },
    { header: "Nội dung liên hệ tiếp theo", key: "nextNote", width: 30 },
  ];

  sellLeads.forEach((item) => {
    const reasonDetail =
      item.status === "FROZEN"
        ? item.frozenReason
        : item.status === "LOSE" || item.status === "CANCELLED"
          ? item.lostReason
          : "";
    const isFutureAppointment =
      item.nextContactAt && dayjs(item.nextContactAt).isAfter(today, "day");
    const row = sheet1.addRow({
      branch: item.branch?.name || "N/A",
      demand: translateStatus(item.type),
      staff: item.assignedTo?.fullName,
      dateIn: dayjs(item.createdAt).format("DD/MM/YYYY"),
      timeIn: dayjs(item.createdAt).format("HH:mm"),
      refStaff: item.referrer?.fullName,
      source: item.referrer?.department?.name || "Vãng lai",
      sourceDetail: translateSource(item.source),
      name: item.fullName.toUpperCase(),
      level: translateStatus(item.urgencyLevel),
      reasonDetail: reasonDetail || "",
      address: item.address,
      province: item.province,
      model: item.leadCar?.modelName || "N/A",
      grade: item.carModel?.grade || "N/A",
      gradeTradee: item.tradeInModel?.grade,
      modelTrade: item.tradeInModel?.name,
      year: item.leadCar?.year || item.carYear,
      odo: item.leadCar?.odo ? Number(item.leadCar.odo) : null,
      inspector: item.inspectorRef?.fullName,
      inspectStatus: translateStatus(item.inspectStatus),
      tsurePrice: item.leadCar?.tSurePrice
        ? Number(item.leadCar.tSurePrice)
        : null,
      expPrice:
        item.leadCar?.expectedPrice || item.expectedPrice
          ? Number(item.leadCar?.expectedPrice || item.expectedPrice)
          : null,
      lastDate: item.lastContactAt
        ? dayjs(item.lastContactAt).format("DD/MM/YYYY")
        : "",
      lastRes: item.lastContactResult,
      count: item.contactCount,
      nextDate: isFutureAppointment
        ? dayjs(item.nextContactAt).format("DD/MM/YYYY")
        : dayjs(item.nextContactAt).format("DD/MM/YYYY") + " (Chưa liên hệ)",
      nextNote: isFutureAppointment
        ? item.nextContactNote
        : item.nextContactNote + " (Chưa liên hệ)",
      status: translateStatus(item.status),
    });

    ["odo", "tsurePrice", "expPrice"].forEach((k) => {
      const c = row.getCell(k);
      c.numFmt = NUMBER_FORMAT;
      c.alignment = { horizontal: "right" };
    });
  });

  // --- 3. SHEET 2: BÁN HÀNG ---
  const sheet2 = workbook.addWorksheet("KH Bán Hàng");
  const buyLeads = data.filter((c) => c.type === "BUY");

  sheet2.columns = [
    { header: "CHI NHÁNH", key: "branch", width: 20 },
    { header: "Nhu cầu khách hàng", key: "demand", width: 15 },
    { header: "NVBH Tiếp nhận", key: "staff", width: 20 },
    { header: "Ngày nhận thông tin", key: "dateIn", width: 15 },
    { header: "Tên khách hàng", key: "name", width: 25 },
    { header: "Ngày xem xe", key: "dateViewCar", width: 15 },
    { header: "Đánh giá trạng thái", key: "level", width: 15 },
    { header: "Tình trạng hồ sơ", key: "status", width: 15 },
    { header: "Lý do Đóng băng/LOST", key: "reasonDetail", width: 15 },
    { header: "Địa chỉ", key: "address", width: 40 },
    { header: "Tỉnh", key: "province", width: 30 },
    { header: "Nguồn giới thiệu", key: "source", width: 25 },
    { header: "Nguồn chi tiết", key: "sourceDetail", width: 25 },
    { header: "Ngân sách", key: "budget", width: 15 },
    { header: "Model quan tâm", key: "model", width: 15 },
    { header: "Phiên bản", key: "grade", width: 15 },

    { header: "Ngày liên hệ gần nhất", key: "lastDate", width: 15 },
    { header: "Kết quả LH gần nhất", key: "lastRes", width: 30 },
    { header: "Số lần LH", key: "count", width: 10 },
    { header: "Ngày liên hệ tiếp theo", key: "nextDate", width: 15 },
    { header: "Nội dung liên hệ tiếp theo", key: "nextNote", width: 30 },
  ];

  buyLeads.forEach((item) => {
    const reasonDetail =
      item.status === "FROZEN"
        ? item.frozenReason
        : item.status === "LOSE" || item.status === "CANCELLED"
          ? item.lostReason
          : "";
    const isFutureAppointment =
      item.nextContactAt && dayjs(item.nextContactAt).isAfter(today, "day");
    const row = sheet2.addRow({
      branch: item.branch?.name || "N/A",
      demand: "Bán hàng",
      staff: item.assignedTo?.fullName,
      dateIn: dayjs(item.createdAt).format("DD/MM/YYYY"),
      name: item.fullName.toUpperCase(),
      level: translateStatus(item.urgencyLevel),
      reasonDetail: reasonDetail || "",
      address: `${item.province || ""} ${item.address || ""}`,
      province: item.province,
      dateViewCar: dayjs(item.dateViewCar).format("DD/MM/YYYY") ?? "-",
      source: item.referrer?.department?.name || "Vãng lai",
      sourceDetail: translateSource(item.source),
      budget: item.budget ? Number(item.budget) : null,
      model: item.carModel?.modelName || "N/A",
      grade: item.carModel?.grade || "N/A",
      year: item.leadCar?.year || "N/A",
      color: item.leadCar?.color || "N/A",

      lastDate: item.lastContactAt
        ? dayjs(item.lastContactAt).format("DD/MM/YYYY")
        : "",
      lastRes: item.lastContactResult,
      count: item.contactCount,
      nextDate: isFutureAppointment
        ? dayjs(item.nextContactAt).format("DD/MM/YYYY")
        : dayjs(item.nextContactAt).format("DD/MM/YYYY") + " (Chưa liên hệ)",
      nextNote: isFutureAppointment
        ? item.nextContactNote
        : item.nextContactNote + " (Chưa liên hệ)",
      status: translateStatus(item.status),
    });

    row.getCell("budget").numFmt = NUMBER_FORMAT;
    row.getCell("budget").alignment = { horizontal: "right" };
  });

  // --- 4. FORMATTING CHUNG ---
  [sheet1, sheet2].forEach((s) => {
    s.getRow(1).height = 35;
    s.getRow(1).eachCell((c) => {
      c.style = styles.header;
    });
    s.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: s.columnCount },
    };

    s.eachRow((row, rowNo) => {
      if (rowNo === 1) return;
      row.height = 25;
      row.eachCell((cell) => {
        if (!cell.style.numFmt) cell.style = { ...styles.cell };
        else {
          cell.border = styles.cell.border;
          cell.font = styles.cell.font;
        }
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Bao_Cao_Toyota_Binh_Duong_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`,
  );
};
