export const qaFilters = {
  timeRanges: ["24 giờ qua", "7 ngày", "30 ngày", "Quý"],
  datasets: ["Tuyển sinh HUS", "PDF đào tạo", "Thông báo sinh viên", "Phòng nghiên cứu"],
  models: ["gemini-2.5-flash", "rag-baseline-v2", "qa-eval-v1"],
  statuses: ["Tất cả", "Ổn định", "Cảnh báo", "Khẩn cấp"],
};

export const qaSummary = {
  data: [
    { label: "Tổng bộ dữ liệu", value: "8", status: "healthy", note: "raw + bộ kiểm thử" },
    { label: "Tỷ lệ rỗng", value: "1.8%", status: "healthy", note: "-0.6% so với lần quét trước" },
    { label: "Cột thiếu", value: "3", status: "warning", note: "trường metadata owner" },
    { label: "Điểm lệch", value: "0.21", status: "warning", note: "trang tuyển sinh thay đổi" },
    { label: "Vi phạm rule", value: "14", status: "critical", note: "cần rà trước khi index" },
  ],
  model: [
    { label: "Model hiện tại", value: "Gemini 2.5 Flash", status: "healthy", note: "API server-side" },
    { label: "Độ chính xác", value: "91.4%", status: "healthy", note: "+2.1% so với baseline" },
    { label: "Điểm F1", value: "0.88", status: "healthy", note: "macro có trọng số" },
    { label: "Rủi ro overfit", value: "Thấp", status: "healthy", note: "loss gap 0.04" },
    { label: "Điểm fairness", value: "0.93", status: "warning", note: "lệch nhẹ theo ngôn ngữ" },
    { label: "Regression đạt", value: "94%", status: "warning", note: "3 prompt lỗi" },
  ],
  system: [
    { label: "Uptime API", value: "99.92%", status: "healthy", note: "7 ngày gần nhất" },
    { label: "Latency TB", value: "820ms", status: "warning", note: "p95 1.9s" },
    { label: "Tỷ lệ lỗi", value: "0.42%", status: "healthy", note: "đa số bad request" },
    { label: "Request/phút", value: "184", status: "healthy", note: "+12%" },
    { label: "Phiên hoạt động", value: "37", status: "healthy", note: "người dùng thử nghiệm" },
    { label: "Cảnh báo drift", value: "5", status: "warning", note: "2 chưa xử lý" },
  ],
};

export const dataQaRows = [
  { dataset: "Tuyển sinh HUS", records: 12480, missing: 1.2, duplicates: 0.4, drift: "warning", validation: "warning" },
  { dataset: "PDF đào tạo", records: 8320, missing: 0.8, duplicates: 0.1, drift: "healthy", validation: "healthy" },
  { dataset: "Thông báo sinh viên", records: 3610, missing: 2.9, duplicates: 1.3, drift: "warning", validation: "healthy" },
  { dataset: "Phòng nghiên cứu", records: 2260, missing: 4.1, duplicates: 0.6, drift: "critical", validation: "warning" },
  { dataset: "Quy định/chính sách", records: 1580, missing: 0.6, duplicates: 0.0, drift: "healthy", validation: "healthy" },
];

export const missingValuesByColumn = [
  { name: "source_url", value: 0.5 },
  { name: "category", value: 1.4 },
  { name: "author", value: 7.8 },
  { name: "published_at", value: 3.2 },
  { name: "language", value: 0.7 },
  { name: "license", value: 5.4 },
];

export const distributionComparison = [
  { bucket: "Tuyển sinh", train: 34, current: 41 },
  { bucket: "Đào tạo", train: 26, current: 24 },
  { bucket: "Sinh viên", train: 16, current: 12 },
  { bucket: "Nghiên cứu", train: 15, current: 18 },
  { bucket: "Quy định", train: 9, current: 5 },
];

export const qaStatusBreakdown = [
  { name: "Đạt", value: 68, fill: "#0f766e" },
  { name: "Cảnh báo", value: 24, fill: "#b45309" },
  { name: "Lỗi", value: 8, fill: "#b91c1c" },
];

export const ruleViolations = [
  { rule: "Mỗi PDF cần có URL nguồn công khai", dataset: "Phòng nghiên cứu", count: 7, severity: "critical" },
  { rule: "Category phải thuộc taxonomy đã duyệt", dataset: "Tuyển sinh HUS", count: 4, severity: "warning" },
  { rule: "Tiêu đề tài liệu không được rỗng", dataset: "Thông báo sinh viên", count: 2, severity: "warning" },
  { rule: "Ngôn ngữ phải là vi/en", dataset: "PDF đào tạo", count: 1, severity: "healthy" },
];

export const sampleRows = [
  { id: "doc_027", title: "Thông báo tuyển sinh 2025", category: "tuyen_sinh", status: "hợp lệ" },
  { id: "doc_114", title: "Hồ sơ lab khoa học dữ liệu", category: "nghien_cuu", status: "rà soát" },
  { id: "doc_812", title: "Chương trình sau đại học", category: "dao_tao", status: "hợp lệ" },
  { id: "doc_003", title: "Hướng dẫn ký túc xá", category: "sinh_vien", status: "hợp lệ" },
];

export const modelLoss = [
  { step: "1k", train: 0.92, validation: 1.02 },
  { step: "2k", train: 0.66, validation: 0.75 },
  { step: "3k", train: 0.49, validation: 0.56 },
  { step: "4k", train: 0.38, validation: 0.43 },
  { step: "5k", train: 0.31, validation: 0.35 },
  { step: "6k", train: 0.28, validation: 0.32 },
];

export const modelVersions = [
  { version: "qa-eval-v1", trainAcc: 88.1, valAcc: 84.7, f1: 0.82, drift: "warning", readiness: "hold" },
  { version: "rag-baseline-v2", trainAcc: 91.0, valAcc: 88.8, f1: 0.86, drift: "healthy", readiness: "ready" },
  { version: "gemini-2.5-flash", trainAcc: 94.2, valAcc: 91.4, f1: 0.88, drift: "healthy", readiness: "ready" },
  { version: "prompt-v3", trainAcc: 93.5, valAcc: 89.0, f1: 0.84, drift: "warning", readiness: "review" },
];

export const metricComparison = [
  { metric: "Accuracy", baseline: 88, current: 91 },
  { metric: "Precision", baseline: 84, current: 89 },
  { metric: "Recall", baseline: 82, current: 87 },
  { metric: "F1", baseline: 83, current: 88 },
  { metric: "Faithfulness", baseline: 80, current: 86 },
];

export const confusionMatrix = [
  [92, 5, 2, 1],
  [7, 84, 6, 3],
  [3, 8, 81, 8],
  [2, 4, 7, 87],
];

export const fairnessScores = [
  { group: "Tiếng Việt", score: 94, baseline: 91 },
  { group: "Tiếng Anh", score: 89, baseline: 87 },
  { group: "Câu hỏi ngắn", score: 92, baseline: 88 },
  { group: "Câu hỏi dài", score: 87, baseline: 82 },
  { group: "OCR nhiễu", score: 81, baseline: 76 },
];

export const regressionTests = [
  { test: "Trả lời tuyển sinh đúng sự thật", status: "pass", latency: "740ms", owner: "QA" },
  { test: "Bắt buộc citation", status: "pass", latency: "810ms", owner: "QA" },
  { test: "Từ chối chính sách không rõ nguồn", status: "fail", latency: "690ms", owner: "An toàn" },
  { test: "Diễn giải tiếng Việt", status: "pass", latency: "880ms", owner: "NLP" },
  { test: "Không lộ API key", status: "pass", latency: "42ms", owner: "Bảo mật" },
];

export const latencySeries = [
  { time: "09:00", avg: 720, p95: 1320 },
  { time: "10:00", avg: 760, p95: 1480 },
  { time: "11:00", avg: 840, p95: 1760 },
  { time: "12:00", avg: 810, p95: 1510 },
  { time: "13:00", avg: 920, p95: 1890 },
  { time: "14:00", avg: 780, p95: 1420 },
];

export const errorRateSeries = [
  { time: "09:00", error: 0.21 },
  { time: "10:00", error: 0.32 },
  { time: "11:00", error: 0.54 },
  { time: "12:00", error: 0.44 },
  { time: "13:00", error: 0.61 },
  { time: "14:00", error: 0.36 },
];

export const throughputSeries = [
  { time: "09:00", requests: 121 },
  { time: "10:00", requests: 148 },
  { time: "11:00", requests: 184 },
  { time: "12:00", requests: 166 },
  { time: "13:00", requests: 201 },
  { time: "14:00", requests: 176 },
];

export const resourceUsage = [
  { name: "API CPU", value: 58 },
  { name: "API RAM", value: 64 },
  { name: "Worker CPU", value: 49 },
  { name: "Cache RAM", value: 37 },
];

export const driftTrend = [
  { day: "T2", score: 0.12 },
  { day: "T3", score: 0.16 },
  { day: "T4", score: 0.18 },
  { day: "T5", score: 0.27 },
  { day: "T6", score: 0.21 },
  { day: "T7", score: 0.23 },
  { day: "CN", score: 0.19 },
];

export const apiTests = [
  { endpoint: "/api/health", method: "GET", responseTime: "38ms", statusCode: 200, result: "pass" },
  { endpoint: "/api/chat", method: "POST", responseTime: "842ms", statusCode: 200, result: "pass" },
  { endpoint: "/api/auth/login", method: "POST", responseTime: "64ms", statusCode: 200, result: "pass" },
  { endpoint: "/api/qa", method: "GET", responseTime: "51ms", statusCode: 200, result: "pass" },
  { endpoint: "/api/bi", method: "GET", responseTime: "57ms", statusCode: 200, result: "pass" },
];

export const prometheusMetrics = [
  'lumi_api_requests_total{route="/api/chat"} 18422',
  'lumi_api_latency_p95_ms{route="/api/chat"} 1890',
  'lumi_chat_errors_total{provider="gemini"} 14',
  'lumi_dataset_drift_score{dataset="admissions"} 0.21',
  'lumi_active_sessions 37',
];

export const alerts = [
  { time: "14:02", title: "Latency p95 vượt ngưỡng", severity: "warning", owner: "Nền tảng" },
  { time: "13:28", title: "Drift bộ nghiên cứu đang tăng", severity: "warning", owner: "Data QA" },
  { time: "12:41", title: "Regression ở câu trả lời chính sách", severity: "critical", owner: "Model QA" },
  { time: "10:14", title: "Manifest nguồn thiếu trường owner", severity: "warning", owner: "Data QA" },
];

export const incidents = [
  { time: "14:10", event: "QA lead đã nhận issue regression", status: "active" },
  { time: "13:52", event: "Drift detector chạy lại phân đoạn tuyển sinh HUS", status: "monitoring" },
  { time: "11:18", event: "Route kiểm tra Gemini trả trạng thái ổn định", status: "resolved" },
  { time: "09:05", event: "Hoàn tất lượt validation hằng ngày", status: "resolved" },
];
