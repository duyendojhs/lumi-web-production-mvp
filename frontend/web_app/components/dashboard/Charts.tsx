"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const colors = ["#0f766e", "#0f4c81", "#b45309", "#7c3aed", "#64748b", "#b91c1c"];
const chartLabels: Record<string, string> = {
  alerts: "cảnh báo",
  api: "lượt API",
  avg: "trung bình",
  baseline: "baseline",
  chats: "phiên chat",
  content: "nội dung",
  current: "hiện tại",
  draft: "bản nháp",
  error: "lỗi",
  p95: "p95",
  published: "đã xuất bản",
  requests: "request",
  score: "điểm",
  train: "train",
  users: "người dùng",
  validation: "validation",
  admissions: "tuyển sinh",
  training: "đào tạo",
  research: "nghiên cứu",
};
const dayLabels: Record<string, string> = {
  Mon: "T2",
  Tue: "T3",
  Wed: "T4",
  Thu: "T5",
  Fri: "T6",
};

function chartLabel(value: unknown) {
  const key = String(value);
  return chartLabels[key] ?? dayLabels[key] ?? key;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function ChartEmpty({ height, reason = "Chưa có dữ liệu biểu đồ" }: Readonly<{ height: number; reason?: string }>) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line bg-mist text-xs font-medium text-slate-500" style={{ height }}>
      {reason}
    </div>
  );
}

function StaticBarPreview({ data, height }: Readonly<{ data: Record<string, string | number>[]; height: number }>) {
  const values = data.map((item) => Number(item.value ?? item.count ?? 0)).filter((value) => Number.isFinite(value));
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-2 rounded-lg border border-line bg-mist p-3" style={{ height }}>
      {data.slice(0, 10).map((item, index) => {
        const value = Number(item.value ?? item.count ?? 0);
        return (
          <div key={String(item.name ?? index)} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md" style={{ height: `${Math.max(8, (value / max) * (height - 72))}px`, background: colors[index % colors.length] }} />
            <span className="max-w-full truncate text-[10px] font-medium text-slate-500">{chartLabel(item.name ?? index)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CompactBarChart({
  data,
  xKey = "name",
  bars,
  height = 220,
}: Readonly<{ data: Record<string, string | number>[]; xKey?: string; bars: string[]; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <ChartEmpty height={height} />;
  if (!mounted) return <StaticBarPreview data={data} height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value, name) => [value, chartLabel(name)]} labelFormatter={chartLabel} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={chartLabel} />
          {bars.map((bar, index) => (
            <Bar key={bar} dataKey={bar} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompactLineChart({
  data,
  xKey,
  lines,
  height = 220,
}: Readonly<{ data: Record<string, string | number>[]; xKey: string; lines: string[]; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <ChartEmpty height={height} />;
  if (!mounted) return <StaticBarPreview data={data} height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value, name) => [value, chartLabel(name)]} labelFormatter={chartLabel} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={chartLabel} />
          {lines.map((line, index) => (
            <Line key={line} type="monotone" dataKey={line} stroke={colors[index % colors.length]} strokeWidth={2} dot={{ r: 2 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompactAreaChart({
  data,
  xKey,
  areas,
  height = 220,
}: Readonly<{ data: Record<string, string | number>[]; xKey: string; areas: string[]; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <ChartEmpty height={height} />;
  if (!mounted) return <StaticBarPreview data={data} height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
          <defs>
            {areas.map((area, index) => (
              <linearGradient key={area} id={`area-${area}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value, name) => [value, chartLabel(name)]} labelFormatter={chartLabel} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={chartLabel} />
          {areas.map((area, index) => (
            <Area
              key={area}
              type="monotone"
              dataKey={area}
              stroke={colors[index % colors.length]}
              fill={`url(#area-${area})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChartPanel({ data, height = 220 }: Readonly<{ data: Array<{ name: string; value: number; fill?: string }>; height?: number }>) {
  const mounted = useMounted();
  if (!data.length) return <ChartEmpty height={height} />;
  if (!mounted) return <StaticBarPreview data={data} height={height} />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="78%" paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.fill || colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, chartLabel(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={chartLabel} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResourceBars({ data }: Readonly<{ data: Array<{ name: string; value: number }> }>) {
  return (
    <div className="grid gap-3">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{item.name}</span>
            <span className="font-semibold text-ink">{item.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full" style={{ width: `${item.value}%`, background: colors[index % colors.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MatrixHeatmap({ matrix, labels }: Readonly<{ matrix: number[][]; labels: string[] }>) {
  const max = Math.max(...matrix.flat());
  return (
    <div className="grid gap-1 text-xs">
      <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${labels.length}, minmax(42px, 1fr))` }}>
        <div />
        {labels.map((label) => (
          <div key={label} className="truncate text-center font-semibold text-slate-500">
            {label}
          </div>
        ))}
      </div>
      {matrix.map((row, rowIndex) => (
        <div key={labels[rowIndex]} className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${labels.length}, minmax(42px, 1fr))` }}>
          <div className="truncate py-2 font-semibold text-slate-600">{labels[rowIndex]}</div>
          {row.map((value, colIndex) => {
            const alpha = 0.12 + (value / max) * 0.78;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="rounded-md px-2 py-2 text-center font-semibold text-ink"
                style={{ background: `rgba(15, 118, 110, ${alpha})` }}
                title={`${labels[rowIndex]} -> ${labels[colIndex]}: ${value}`}
              >
                {value}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function SegmentHeatmap({ rows }: Readonly<{ rows: Array<Record<string, string | number>> }>) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return (
    <div className="grid gap-1 text-xs">
      <div className="grid grid-cols-[110px_repeat(5,1fr)] gap-1">
        <div />
        {days.map((day) => (
          <div key={day} className="text-center font-semibold text-slate-500">
            {dayLabels[day] ?? day}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={String(row.segment)} className="grid grid-cols-[110px_repeat(5,1fr)] gap-1">
          <div className="truncate py-2 font-semibold text-slate-600">{row.segment}</div>
          {days.map((day) => {
            const value = Number(row[day]);
            const alpha = 0.1 + value / 120;
            return (
              <div key={day} className="rounded-md px-2 py-2 text-center font-semibold text-ink" style={{ background: `rgba(15, 76, 129, ${alpha})` }}>
                {value}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
