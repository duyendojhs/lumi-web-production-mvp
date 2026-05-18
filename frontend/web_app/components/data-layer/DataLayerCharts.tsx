"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = ["#0f766e", "#0f4c81", "#b45309", "#7c3aed", "#64748b", "#be123c", "#0891b2", "#be123c"];
const statusColors: Record<string, string> = {
  healthy: "#0f766e",
  ready: "#0f766e",
  warning: "#b45309",
  critical: "#be123c",
  planned: "#64748b",
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function Empty({ height, label = "Chưa có dữ liệu biểu đồ" }: Readonly<{ height: number; label?: string }>) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line bg-mist text-xs font-semibold text-slate-500" style={{ height }}>
      {label}
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 85) return "healthy";
  if (score >= 65) return "warning";
  return "critical";
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export function HealthGauge({
  score,
  label = "Overall Data Health",
  breakdown = [],
}: Readonly<{
  score: number;
  label?: string;
  breakdown?: Array<{ name: string; score: number; weight?: string }>;
}>) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = scoreTone(safeScore);
  const color = statusColors[tone];
  const end = -112 + (safeScore / 100) * 224;
  return (
    <div className="grid min-h-[246px] gap-3 rounded-lg bg-mist p-3">
      <div className="grid place-items-center rounded-lg bg-white px-3 py-2">
        <svg viewBox="0 0 240 170" className="h-[170px] w-full max-w-[260px]" role="img" aria-label={`${label}: ${safeScore}%`}>
        <path d={describeArc(120, 128, 82, -112, 112)} fill="none" stroke="#e2e8f0" strokeWidth="18" strokeLinecap="round" />
        <path d={describeArc(120, 128, 82, -112, end)} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round">
          <title>{`${label}: ${safeScore}%`}</title>
        </path>
        <text x="120" y="100" textAnchor="middle" className="select-none fill-slate-900 text-[34px] font-bold">{safeScore}%</text>
        <text x="120" y="122" textAnchor="middle" className="select-none fill-slate-500 text-[12px] font-semibold">{label}</text>
        <text x="120" y="145" textAnchor="middle" className="select-none fill-amber-700 text-[10px] font-bold">Trạng thái: {statusLabel(tone)}</text>
        </svg>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {breakdown.slice(0, 5).map((item) => (
          <div key={item.name} className="grid grid-cols-[1fr_58px] items-center gap-2 rounded-lg bg-white px-2 py-1.5">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold leading-4 text-slate-700" title={item.name}>{shortScoreName(item.name)}</span>
                <span className="font-bold text-ink">{item.score}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full" style={{ width: `${Math.max(3, Math.min(100, item.score))}%`, background: statusColors[scoreTone(item.score)] }} />
              </div>
            </div>
            <span className="min-w-[58px] rounded-md bg-mist px-2 py-1 text-center text-[10px] font-semibold text-slate-600">{statusLabel(scoreTone(item.score))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QualityGauge({ score, label }: Readonly<{ score: number; label: string }>) {
  return <HealthGauge score={score} label={label} />;
}

export function FileTypeDonut({ data, height = 230 }: Readonly<{ data: Array<{ name: string; value: number }>; height?: number }>) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!data.length || !total) return <Empty height={height} />;
  let offset = 0;
  return (
    <div className="grid gap-3 md:grid-cols-[170px_1fr]" style={{ minHeight: height }}>
      <svg viewBox="0 0 170 170" className="h-[170px] w-full" role="img" aria-label="File type distribution donut">
        <circle cx="85" cy="85" r="58" fill="none" stroke="#e2e8f0" strokeWidth="22" />
        {data.map((item, index) => {
          const share = pct(item.value, total);
          const dashOffset = -offset;
          offset += share;
          return (
            <circle
              key={item.name}
              cx="85"
              cy="85"
              r="58"
              fill="none"
              stroke={palette[index % palette.length]}
              strokeWidth="22"
              pathLength={100}
              strokeDasharray={`${share} ${100 - share}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform="rotate(-90 85 85)"
            >
              <title>{`${item.name}: ${item.value} tài liệu (${share}%)`}</title>
            </circle>
          );
        })}
        <text x="85" y="78" textAnchor="middle" className="fill-slate-900 text-[26px] font-bold">{total}</text>
        <text x="85" y="98" textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">tài liệu</text>
      </svg>
      <div className="grid content-center gap-2">
        {data.map((item, index) => {
          const share = pct(item.value, total);
          return (
            <div key={item.name} className="grid grid-cols-[12px_1fr_auto] items-center gap-2 rounded-lg bg-mist px-2 py-1.5" title={`${item.name}: ${item.value} tài liệu (${share}%)`}>
              <span className="h-3 w-3 rounded-sm" style={{ background: palette[index % palette.length] }} />
              <span className="text-xs font-semibold uppercase text-slate-700">{item.name}</span>
              <span className="whitespace-nowrap text-xs font-bold text-ink">{item.value} ({share}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QualityRadarChart({ data, height = 300 }: Readonly<{ data: Array<{ name: string; score: number }>; height?: number }>) {
  const rows = data.slice(0, 8);
  if (!rows.length) return <Empty height={height} />;
  const center = { x: 190, y: 152 };
  const radius = 82;
  const points = rows.map((item, index) => {
    const angle = -90 + (index * 360) / rows.length;
    const valueRadius = radius * Math.max(0, Math.min(100, item.score)) / 100;
    return point(center.x, center.y, valueRadius, angle);
  });
  const gridLevels = [25, 50, 75, 100];
  return (
    <div className="grid gap-2" style={{ minHeight: height }}>
      <svg viewBox="0 0 380 306" className="h-[286px] w-full" role="img" aria-label="Quality radar chart">
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={rows.map((_, index) => {
              const angle = -90 + (index * 360) / rows.length;
              const p = point(center.x, center.y, radius * level / 100, angle);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {rows.map((item, index) => {
          const angle = -90 + (index * 360) / rows.length;
          const axis = point(center.x, center.y, radius, angle);
          const label = point(center.x, center.y, radius + 42, angle);
          return (
            <g key={item.name}>
              <line x1={center.x} y1={center.y} x2={axis.x} y2={axis.y} stroke="#e2e8f0" />
              <text x={label.x} y={label.y} textAnchor={label.x < center.x - 8 ? "end" : label.x > center.x + 8 ? "start" : "middle"} className="fill-slate-600 text-[11px] font-semibold">
                {shortLabel(item.name)}
              </text>
              <text x={label.x} y={label.y + 13} textAnchor={label.x < center.x - 8 ? "end" : label.x > center.x + 8 ? "start" : "middle"} className="fill-slate-900 text-[10px] font-bold">
                {item.score}%
              </text>
            </g>
          );
        })}
        <polygon points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="#0f766e" fillOpacity="0.24" stroke="#0f766e" strokeWidth="2">
          <title>{rows.map((item) => `${item.name}: ${item.score}%`).join(", ")}</title>
        </polygon>
        {points.map((p, index) => <circle key={rows[index].name} cx={p.x} cy={p.y} r="3" fill="#0f766e" />)}
      </svg>
      <div className="flex flex-wrap gap-1">
        {rows.map((item) => <span key={item.name} className="rounded-md bg-mist px-2 py-1 text-[11px] font-semibold text-slate-600">{shortLabel(item.name)} {item.score}%</span>)}
      </div>
    </div>
  );
}

export function HorizontalIssueChart({ data, height = 250 }: Readonly<{ data: Array<Record<string, string | number>>; height?: number }>) {
  const rows = data.map((item) => ({ name: String(item.name), value: Number(item.value || 0) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  if (!rows.length) return <Empty height={height} label="Không có issue mở" />;
  const max = Math.max(...rows.map((item) => item.value), 1);
  return (
    <div className="grid gap-2" style={{ minHeight: height }}>
      {rows.map((item, index) => {
        const isTopBlocker = index === 0;
        return (
          <div key={item.name} className="grid grid-cols-[150px_1fr_44px] items-center gap-2 text-xs">
            <span className="font-semibold leading-4 text-slate-700" title={item.name}>{issueLabel(item.name)}</span>
            <div className="h-7 rounded-md bg-mist">
              <div
                className="flex h-7 items-center justify-end rounded-md px-2 text-[11px] font-bold text-white"
                style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: isTopBlocker ? "#be123c" : "#b45309" }}
                title={`${item.name}: ${item.value} bản ghi ảnh hưởng`}
              >
                {isTopBlocker ? "lớn nhất" : ""}
              </div>
            </div>
            <span className="text-right font-bold text-ink">{item.value}</span>
          </div>
        );
      })}
      <p className="text-[11px] text-slate-500">Sắp xếp giảm dần. Thanh đầu tiên là điểm nghẽn lớn nhất từ output pipeline.</p>
    </div>
  );
}

export function StackedCategoryStatusChart({ data, height = 260 }: Readonly<{ data: Array<Record<string, string | number>>; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <Empty height={height} />;
  if (!mounted) return <StaticStackedBars data={data} height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 18, bottom: 22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-16} textAnchor="end" height={48} tickFormatter={(value) => shortCategory(String(value))} label={{ value: "Nhóm", position: "insideBottom", offset: -16, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: "Tài liệu", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip formatter={(value, name) => [value, String(name) === "ok" ? "ổn định" : statusLabel(String(name))]} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(value) => String(value) === "ok" ? "ổn định" : statusLabel(String(value))} />
          <Bar dataKey="ok" name="ổn định" stackId="a" fill="#0f766e" />
          <Bar dataKey="warning" name="cần xem" stackId="a" fill="#b45309" />
          <Bar dataKey="error" name="lỗi / bỏ qua" stackId="a" fill="#be123c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FreshnessTimeline({ data, height = 250 }: Readonly<{ data: Array<Record<string, string | number>>; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <Empty height={height} />;
  if (!mounted) return <StaticLineTrend data={data} height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 22 }}>
          <defs>
            <linearGradient id="readiness" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="rawScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f4c81" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#0f4c81" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="run" tick={{ fontSize: 11 }} label={{ value: "Lần chạy", position: "insideBottom", offset: -12, fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Điểm", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip formatter={(value, name) => [`${value}%`, translateSeries(String(name))]} labelFormatter={(label) => `Lần chạy: ${label}`} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          <Area type="monotone" name="Sẵn sàng tổng thể" dataKey="readiness" stroke="#0f766e" fill="url(#readiness)" strokeWidth={2} />
          <Area type="monotone" name="Điểm raw" dataKey="raw_score" stroke="#0f4c81" fill="url(#rawScore)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChunkLengthHistogram({ data, height = 250 }: Readonly<{ data: Array<Record<string, string | number>>; height?: number }>) {
  return <ChunkHistogram data={data} height={height} />;
}

export function ChunkHistogram({ data, height = 250 }: Readonly<{ data: Array<Record<string, string | number>>; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <Empty height={height} />;
  if (!mounted) return <StaticBarList data={data.map((item) => ({ name: String(item.bucket), value: Number(item.chunks) }))} height={height} label="chunks" />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} label={{ value: "Độ dài chunk", position: "insideBottom", offset: -12, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: "Chunks", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip formatter={(value) => [`${value} chunk`, "số lượng"]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="chunks" name="chunks" fill="#0f766e" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="chunks" position="top" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBarChart({
  data,
  height = 250,
  xLabel = "Category",
  yLabel = "Chunks",
}: Readonly<{
  data: Array<Record<string, string | number>>;
  height?: number;
  xLabel?: string;
  yLabel?: string;
}>) {
  const mounted = useMounted();
  if (!data.length) return <Empty height={height} />;
  if (!mounted) return <StaticBarList data={data.map((item) => ({ name: String(item.category), value: Number(item.chunks) }))} height={height} label={yLabel.toLowerCase()} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 18, left: 18, bottom: 22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-16} textAnchor="end" height={48} tickFormatter={(value) => shortCategory(String(value))} label={{ value: xLabel, position: "insideBottom", offset: -16, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip formatter={(value) => [`${value} chunk`, "coverage theo nhóm"]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="chunks" name={yLabel} fill="#0f4c81" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="chunks" position="top" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceDomainCards({ data }: Readonly<{ data: Array<Record<string, string | number>> }>) {
  const total = data.reduce((sum, item) => sum + Number(item.documents || 0), 0);
  const max = Math.max(1, ...data.map((item) => Number(item.documents || 0)));
  return (
    <div className="grid gap-2">
      {data.slice(0, 6).map((item, index) => {
        const docs = Number(item.documents || 0);
        return (
          <div key={String(item.domain)} className="rounded-lg border border-line bg-mist p-3" title={String(item.domain)}>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 break-words text-sm font-semibold leading-5 text-ink">{String(item.domain)}</p>
              <span className="min-w-[46px] rounded-md bg-white px-2 py-1 text-center text-[11px] font-semibold text-teal">{pct(docs, total)}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(8, (docs / max) * 100)}%`, background: palette[index % palette.length] }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{docs} tài liệu</span>
              <span>{Number(item.chunks || 0)} chunks</span>
              <span>{statusLabel(String(item.status))}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaticBarList({ data, height, label }: Readonly<{ data: Array<{ name: string; value: number }>; height: number; label: string }>) {
  const rows = data.filter((item) => item.value > 0).slice(0, 8);
  if (!rows.length) return <Empty height={height} />;
  const max = Math.max(...rows.map((item) => item.value), 1);
  return (
    <div className="grid content-center gap-2" style={{ minHeight: height }}>
      {rows.map((item, index) => (
        <div key={item.name} className="grid grid-cols-[108px_1fr_46px] items-center gap-2 text-xs">
          <span className="truncate font-semibold text-slate-700">{item.name}</span>
          <div className="h-6 rounded-md bg-mist">
            <div className="h-6 rounded-md" style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: palette[index % palette.length] }} />
          </div>
          <span className="text-right font-bold text-ink">{item.value}</span>
        </div>
      ))}
      <p className="text-[11px] text-slate-500">Nhãn: {label}. Biểu đồ chuyển sang Recharts sau hydration.</p>
    </div>
  );
}

function StaticStackedBars({ data, height }: Readonly<{ data: Array<Record<string, string | number>>; height: number }>) {
  return (
    <div className="grid content-center gap-2" style={{ minHeight: height }}>
      {data.slice(0, 8).map((item) => {
        const ok = Number(item.ok || 0);
        const warning = Number(item.warning || 0);
        const error = Number(item.error || 0);
        const total = Math.max(1, ok + warning + error);
        return (
          <div key={String(item.category)} className="grid grid-cols-[110px_1fr_36px] items-center gap-2 text-xs">
            <span className="truncate font-semibold text-slate-700">{String(item.category)}</span>
            <div className="flex h-6 overflow-hidden rounded-md bg-mist">
              <span className="bg-emerald-700" style={{ width: `${pct(ok, total)}%` }} title={`ok: ${ok}`} />
              <span className="bg-amber-700" style={{ width: `${pct(warning, total)}%` }} title={`warning: ${warning}`} />
              <span className="bg-rose-700" style={{ width: `${pct(error, total)}%` }} title={`error: ${error}`} />
            </div>
            <span className="text-right font-bold text-ink">{total}</span>
          </div>
        );
      })}
      <div className="flex gap-2 text-[11px] font-semibold text-slate-600">
        <LegendChip color="#0f766e" label="ổn định" />
        <LegendChip color="#b45309" label="cần xem" />
        <LegendChip color="#be123c" label="lỗi/bỏ qua" />
      </div>
    </div>
  );
}

function StaticLineTrend({ data, height }: Readonly<{ data: Array<Record<string, string | number>>; height: number }>) {
  const rows = data.map((item) => ({ run: String(item.run), readiness: Number(item.readiness || 0), raw: Number(item.raw_score || 0) }));
  const width = 360;
  const chartHeight = 170;
  const left = 30;
  const top = 14;
  const xStep = rows.length > 1 ? (width - left - 14) / (rows.length - 1) : 0;
  const toY = (value: number) => top + chartHeight - (Math.max(0, Math.min(100, value)) / 100) * chartHeight;
  const readinessPoints = rows.map((item, index) => `${left + index * xStep},${toY(item.readiness)}`).join(" ");
  const rawPoints = rows.map((item, index) => `${left + index * xStep},${toY(item.raw)}`).join(" ");
  return (
    <div className="grid gap-2" style={{ minHeight: height }}>
      <svg viewBox={`0 0 ${width} 230`} className="h-[220px] w-full" role="img" aria-label="Xu hướng freshness từ lần chạy mới nhất">
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={left} x2={width - 10} y1={toY(value)} y2={toY(value)} stroke="#e2e8f0" />
            <text x="4" y={toY(value) + 3} className="fill-slate-500 text-[9px]">{value}</text>
          </g>
        ))}
        <polyline points={readinessPoints} fill="none" stroke="#0f766e" strokeWidth="2.5" />
        <polyline points={rawPoints} fill="none" stroke="#0f4c81" strokeWidth="2.5" />
        {rows.map((item, index) => <text key={item.run} x={left + index * xStep} y="220" textAnchor="middle" className="fill-slate-500 text-[9px]">{item.run}</text>)}
      </svg>
      <div className="flex gap-3 text-[11px] font-semibold text-slate-600">
        <LegendChip color="#0f766e" label="sẵn sàng tổng thể" />
        <LegendChip color="#0f4c81" label="điểm raw" />
        <span>ước lượng từ lần chạy mới nhất</span>
      </div>
    </div>
  );
}

function LegendChip({ color, label }: Readonly<{ color: string; label: string }>) {
  return <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}</span>;
}

function point(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function shortLabel(label: string) {
  return label.replace("Accuracy/Readiness", "AI Ready").replace("Completeness", "Đầy đủ").replace("Consistency", "Nhất quán");
}

function shortScoreName(label: string) {
  return label.replace("Overall Data Health", "Tổng thể").replace("Content Readiness", "Nội dung").replace("AI Readiness", "AI").replace("Governance Score", "Governance");
}

function issueLabel(label: string) {
  return label.replace("pdf_sample_needs_ocr", "PDF cần OCR").replace("empty_processed_text", "Text rỗng").replace("possible_mojibake", "Encoding").replace("html_short_body", "HTML mỏng").replace("pdf_needs_ocr", "Hàng đợi OCR").replace("large_file", "File lớn").replace("pdf_text_truncated", "PDF bị cắt");
}

function shortCategory(label: string) {
  return label.replace("thong_tin_chung", "thong tin").replace("nghien_cuu", "nghien cuu").replace("tuyen_sinh", "tuyen sinh").replace("sinh_vien", "sinh vien");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    healthy: "ổn định",
    ready: "sẵn sàng",
    warning: "cần xem",
    critical: "khẩn cấp",
    planned: "kế hoạch",
    error: "lỗi",
  };
  return labels[status] ?? status;
}

function translateSeries(name: string) {
  return name.replace("readiness", "sẵn sàng").replace("raw_score", "điểm raw").replace("_", " ");
}
