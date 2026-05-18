import type { LucideIcon } from "lucide-react";

export type StatusTone = "healthy" | "warning" | "critical" | "planned" | "active" | "pass" | "fail" | "review" | "hold" | "ready";

const toneClasses: Record<string, string> = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  active: "bg-cyan-50 text-cyan-700 border-cyan-200",
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fail: "bg-rose-50 text-rose-700 border-rose-200",
  review: "bg-amber-50 text-amber-800 border-amber-200",
  hold: "bg-rose-50 text-rose-700 border-rose-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  locked: "bg-slate-100 text-slate-700 border-slate-200",
  monitoring: "bg-cyan-50 text-cyan-700 border-cyan-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusLabels: Record<string, string> = {
  healthy: "ổn định",
  warning: "cần xem",
  critical: "khẩn cấp",
  planned: "kế hoạch",
  active: "đang chạy",
  pass: "đạt",
  fail: "lỗi",
  review: "rà soát",
  hold: "tạm dừng",
  ready: "sẵn sàng",
  local: "local",
  missing: "thiếu",
  success: "thành công",
  error: "lỗi",
  draft: "bản nháp",
  published: "đã xuất bản",
  locked: "đã khóa",
  monitoring: "đang theo dõi",
  resolved: "đã xử lý",
};

export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const label = statusLabels[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${toneClasses[status] || toneClasses.planned}`}>
      {label}
    </span>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  status,
}: Readonly<{
  icon?: LucideIcon;
  label: string;
  value: string;
  note: string;
  status?: string;
}>) {
  return (
    <div className="min-h-[112px] rounded-lg border border-line bg-white p-3 shadow-panel transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-6 text-ink" title={value}>{value}</p>
        </div>
        {Icon ? (
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-mist text-teal">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs leading-4 text-slate-500" title={note}>{note}</p>
        {status ? <StatusBadge status={status} /> : null}
      </div>
    </div>
  );
}

export function ModuleHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-3 border-b border-line bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal">{eyebrow}</p>
        <h1 className="mt-1 truncate text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: Readonly<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-white shadow-panel ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function ActionButton({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <button className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-mist">
      {children}
    </button>
  );
}

export function FilterSelect({ label, options }: Readonly<{ label: string; options: string[] }>) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-mist px-2 py-1.5 text-xs text-slate-600">
      <span className="font-semibold text-slate-700">{label}</span>
      <select className="bg-transparent text-xs font-medium text-ink outline-none">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function ModuleShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="h-[calc(100vh-2rem)] min-h-[760px] overflow-hidden rounded-lg border border-line bg-mist shadow-panel">{children}</div>;
}

export function ModuleBody({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="h-[calc(100%-82px)] overflow-y-auto p-3">{children}</div>;
}
