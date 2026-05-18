export const cmsSummary = [
  { label: "Nội dung xuất bản", value: "184", status: "healthy", note: "+12 trong tuần" },
  { label: "Bản nháp", value: "23", status: "warning", note: "7 cần rà soát" },
  { label: "Biên tập viên", value: "9", status: "healthy", note: "3 đang trực tuyến" },
  { label: "Đổi cấu hình", value: "5", status: "warning", note: "chờ phê duyệt" },
];

export const contentItems = [
  { title: "Hướng dẫn tuyển sinh 2025", category: "Tuyển sinh", status: "published", author: "Biên tập A", updated: "18/05 09:14", views: 1240 },
  { title: "FAQ chương trình sau đại học", category: "Đào tạo", status: "draft", author: "Biên tập B", updated: "18/05 08:42", views: 0 },
  { title: "Checklist ký túc xá sinh viên", category: "Sinh viên", status: "published", author: "Biên tập C", updated: "17/05 21:10", views: 684 },
  { title: "Hồ sơ phòng thí nghiệm", category: "Nghiên cứu", status: "review", author: "Phân tích A", updated: "17/05 17:45", views: 213 },
  { title: "Ghi chú bảo mật dữ liệu", category: "Hệ thống", status: "published", author: "Admin", updated: "16/05 14:20", views: 431 },
  { title: "Lịch học bổng", category: "Tuyển sinh", status: "draft", author: "Biên tập D", updated: "15/05 12:09", views: 0 },
];

export const roleMatrix = [
  { role: "Admin", users: 2, content: "toàn quyền", config: "toàn quyền", analytics: "toàn quyền" },
  { role: "Biên tập", users: 6, content: "ghi", config: "yêu cầu", analytics: "đọc" },
  { role: "Phân tích", users: 4, content: "đọc", config: "không", analytics: "ghi" },
  { role: "Chỉ đọc", users: 18, content: "đọc", config: "không", analytics: "đọc" },
];

export const systemConfig = [
  { key: "Nhà cung cấp LLM", value: "Gemini", status: "locked" },
  { key: "Model", value: "gemini-2.5-flash", status: "active" },
  { key: "Chế độ app", value: "Production shell", status: "active" },
  { key: "Bắt buộc citation", value: "Bật", status: "active" },
  { key: "RAG index", value: "Keyword đã sẵn sàng", status: "ready" },
];

export const platformCards = [
  { name: "Web App", status: "healthy", version: "0.3.0", environment: "local/prod", readiness: 96 },
  { name: "Ứng dụng mobile", status: "planned", version: "concept", environment: "thiết kế", readiness: 28 },
  { name: "Tích hợp API", status: "healthy", version: "server v1", environment: "Next routes", readiness: 84 },
  { name: "PWA", status: "warning", version: "shell", environment: "Next.js", readiness: 62 },
];

export const integrationFlow = [
  { from: "Người dùng", to: "Next.js Web App", health: "healthy" },
  { from: "Web App", to: "API routes", health: "healthy" },
  { from: "API routes", to: "Gemini", health: "healthy" },
  { from: "Dữ liệu raw", to: "RAG keyword", health: "ready" },
  { from: "QA", to: "Giám sát", health: "warning" },
];

export const releaseNotes = [
  { version: "0.3.0", date: "18/05", note: "RAG citation, Supabase Auth/RBAC và xử lý OCR hoàn chỉnh" },
  { version: "0.2.0", date: "18/05", note: "Runtime Gemini server-side, dashboard QA/CMS/BI" },
  { version: "0.1.5", date: "17/05", note: "Phát hiện data_raw và endpoint kiểm tra sức khỏe" },
];

export const operationalKpis = [
  { label: "Lượt dùng hôm nay", value: "1,842", status: "healthy", note: "phiên chat" },
  { label: "Lượt gọi API", value: "18.4k", status: "healthy", note: "24 giờ gần nhất" },
  { label: "Người dùng hoạt động", value: "37", status: "healthy", note: "phiên thử nghiệm" },
  { label: "Nội dung xuất bản", value: "184", status: "healthy", note: "tổng CMS" },
  { label: "Cảnh báo QA", value: "5", status: "warning", note: "2 chưa xử lý" },
];

export const usageTrend = [
  { day: "T2", chats: 420, api: 3600, users: 21 },
  { day: "T3", chats: 520, api: 4300, users: 24 },
  { day: "T4", chats: 690, api: 5900, users: 29 },
  { day: "T5", chats: 760, api: 7100, users: 32 },
  { day: "T6", chats: 840, api: 8200, users: 37 },
  { day: "T7", chats: 610, api: 5700, users: 28 },
  { day: "CN", chats: 720, api: 6400, users: 31 },
];

export const questionCategories = [
  { name: "Tuyển sinh", value: 38, fill: "#0f766e" },
  { name: "Đào tạo", value: 25, fill: "#0f4c81" },
  { name: "Sinh viên", value: 17, fill: "#b45309" },
  { name: "Nghiên cứu", value: 12, fill: "#7c3aed" },
  { name: "Khác", value: 8, fill: "#64748b" },
];

export const sourceDistribution = [
  { source: "PDF", admissions: 28, training: 42, research: 22 },
  { source: "HTML", admissions: 18, training: 10, research: 4 },
  { source: "TXT", admissions: 8, training: 6, research: 3 },
  { source: "Manifest", admissions: 2, training: 2, research: 1 },
];

export const executiveKpis = [
  { label: "Mức sử dụng", value: "74%", status: "healthy", note: "mục tiêu 70%" },
  { label: "Điểm chất lượng", value: "100/100", status: "healthy", note: "đạt ngưỡng QA" },
  { label: "Sức khỏe hệ thống", value: "96%", status: "healthy", note: "route chính ổn định" },
  { label: "Phủ dữ liệu", value: "100%", status: "healthy", note: "nội dung đã có chunk" },
];

export const segmentHeatmap = [
  { segment: "Tuyển sinh", Mon: 82, Tue: 91, Wed: 88, Thu: 96, Fri: 99 },
  { segment: "Đào tạo", Mon: 68, Tue: 74, Wed: 81, Thu: 77, Fri: 84 },
  { segment: "Sinh viên", Mon: 42, Tue: 51, Wed: 56, Thu: 62, Fri: 59 },
  { segment: "Nghiên cứu", Mon: 36, Tue: 39, Wed: 47, Thu: 44, Fri: 52 },
];

export const biTables = [
  { metric: "Câu hỏi nhiều nhất", value: "Thông tin tuyển sinh 2025", change: "+18%", owner: "Tuyển sinh" },
  { metric: "Nguồn dùng nhiều nhất", value: "PDF đào tạo", change: "+11%", owner: "Dữ liệu" },
  { metric: "Route latency cao nhất", value: "/api/chat", change: "-4%", owner: "Nền tảng" },
  { metric: "Issue QA mở", value: "Câu trả lời chính sách chưa đủ nguồn", change: "mới", owner: "Model QA" },
];
