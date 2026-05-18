"use client";

import { useState } from "react";
import { Edit3, FilePlus2, Filter, LayoutList, Search, Settings, Shield, Trash2, UploadCloud, UsersRound } from "lucide-react";
import { cmsSummary, contentItems, roleMatrix, systemConfig, usageTrend } from "@/lib/mock/ops";
import { ActionButton, FilterSelect, MetricCard, ModuleBody, ModuleHeader, ModuleShell, Panel, StatusBadge } from "@/components/dashboard/Primitives";
import { CompactAreaChart, CompactBarChart } from "@/components/dashboard/Charts";

const sections = ["overview", "content", "roles", "config"] as const;
const sectionLabels: Record<(typeof sections)[number], string> = {
  overview: "Tổng quan",
  content: "Nội dung",
  roles: "Người dùng & role",
  config: "Cấu hình hệ thống",
};

export function CmsConsole() {
  const [active, setActive] = useState<(typeof sections)[number]>("overview");

  return (
    <ModuleShell>
      <ModuleHeader
        eyebrow="CMS / Admin"
        title="Bảng quản trị nội dung"
        description="Quản lý nội dung, người dùng, phân quyền, quy trình xuất bản và cấu hình hệ thống trong một màn hình vận hành."
        actions={
          <>
            <FilterSelect label="Trạng thái" options={["Tất cả", "Đã xuất bản", "Bản nháp", "Rà soát"]} />
            <FilterSelect label="Nhóm" options={["Tất cả", "Tuyển sinh", "Đào tạo", "Sinh viên", "Nghiên cứu"]} />
            <ActionButton><span className="inline-flex items-center gap-2"><FilePlus2 className="h-3.5 w-3.5" /> Tạo nội dung</span></ActionButton>
            <ActionButton><span className="inline-flex items-center gap-2"><UploadCloud className="h-3.5 w-3.5" /> Xuất file</span></ActionButton>
          </>
        }
      />
      <ModuleBody>
        <div className="grid gap-3 xl:grid-cols-[180px_1fr]">
          <aside className="rounded-lg border border-line bg-white p-2 shadow-panel">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActive(section)}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  active === section ? "bg-teal text-white" : "text-slate-700 hover:bg-mist"
                }`}
              >
                {section === "overview" ? <LayoutList className="h-4 w-4" /> : section === "content" ? <Edit3 className="h-4 w-4" /> : section === "roles" ? <UsersRound className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                {sectionLabels[section]}
              </button>
            ))}
          </aside>

          <section className="grid min-w-0 gap-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cmsSummary.map((item, index) => (
                <MetricCard key={item.label} icon={[Edit3, Filter, UsersRound, Settings][index]} {...item} />
              ))}
            </div>

            {active === "overview" ? <CmsOverview /> : active === "content" ? <ContentManager /> : active === "roles" ? <UsersRoles /> : <SystemConfig />}
          </section>
        </div>
      </ModuleBody>
    </ModuleShell>
  );
}

function CmsOverview() {
  return (
    <div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Hoạt động nội dung" subtitle="Xu hướng xuất bản và sử dụng" className="xl:col-span-7">
        <CompactAreaChart data={usageTrend} xKey="day" areas={["chats", "users"]} height={250} />
      </Panel>
      <Panel title="Nội dung theo nhóm" subtitle="Cơ cấu công việc CMS" className="xl:col-span-5">
        <CompactBarChart
          data={[
            { category: "Tuyển sinh", published: 58, draft: 8 },
            { category: "Đào tạo", published: 44, draft: 5 },
            { category: "Sinh viên", published: 31, draft: 4 },
            { category: "Nghiên cứu", published: 25, draft: 3 },
            { category: "Hệ thống", published: 26, draft: 3 },
          ]}
          xKey="category"
          bars={["published", "draft"]}
          height={250}
        />
      </Panel>
      <ContentManager compact />
    </div>
  );
}

function ContentManager({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <Panel title="Danh sách nội dung" subtitle="CRUD, xuất bản, tìm kiếm và bộ lọc" className={compact ? "xl:col-span-12" : ""}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex min-w-[280px] flex-1 items-center gap-2 rounded-lg border border-line bg-mist px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="w-full bg-transparent outline-none" placeholder="Tìm nội dung..." />
        </label>
        <ActionButton><span className="inline-flex items-center gap-2"><Edit3 className="h-3.5 w-3.5" /> Sửa</span></ActionButton>
        <ActionButton>Xuất bản</ActionButton>
        <ActionButton>Gỡ xuất bản</ActionButton>
        <ActionButton><span className="inline-flex items-center gap-2"><Trash2 className="h-3.5 w-3.5" /> Xóa</span></ActionButton>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="sticky top-0 bg-white text-slate-500">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Tiêu đề</th>
              <th className="py-2 pr-3">Nhóm</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3">Người phụ trách</th>
              <th className="py-2 pr-3">Cập nhật</th>
              <th className="py-2 pr-3">Lượt xem</th>
            </tr>
          </thead>
          <tbody>
            {contentItems.map((item) => (
              <tr key={item.title} className="border-b border-line hover:bg-mist">
                <td className="py-2 pr-3 font-semibold text-ink">{item.title}</td>
                <td className="py-2 pr-3">{item.category}</td>
                <td className="py-2 pr-3"><StatusBadge status={item.status === "published" ? "healthy" : item.status} /></td>
                <td className="py-2 pr-3">{item.author}</td>
                <td className="py-2 pr-3">{item.updated}</td>
                <td className="py-2 pr-3">{item.views.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function UsersRoles() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
      <Panel title="Người dùng & role" subtitle="Ma trận phân quyền">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-slate-500">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Người dùng</th>
              <th className="py-2 pr-3">Nội dung</th>
              <th className="py-2 pr-3">Cấu hình</th>
              <th className="py-2 pr-3">Phân tích</th>
            </tr>
          </thead>
          <tbody>
            {roleMatrix.map((role) => (
              <tr key={role.role} className="border-b border-line">
                <td className="py-2 pr-3 font-semibold text-ink">{role.role}</td>
                <td className="py-2 pr-3">{role.users}</td>
                <td className="py-2 pr-3">{role.content}</td>
                <td className="py-2 pr-3">{role.config}</td>
                <td className="py-2 pr-3">{role.analytics}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Ghi chú truy cập" subtitle="Phân quyền sản phẩm">
        <div className="grid gap-2 text-sm text-slate-700">
          <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-teal" /> Admin được duyệt cấu hình hệ thống.</p>
          <p>Biên tập viên được tạo, sửa, xuất bản và gỡ nội dung.</p>
          <p>Nhóm phân tích được xem CMS và ghi chú BI, nhưng không đổi cấu hình runtime.</p>
          <p>Role chỉ đọc không có quyền chỉnh sửa.</p>
        </div>
      </Panel>
    </div>
  );
}

function SystemConfig() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_420px]">
      <Panel title="Cấu hình hệ thống" subtitle="Runtime và trạng thái tính năng">
        <div className="grid gap-2">
          {systemConfig.map((item) => (
            <div key={item.key} className="grid grid-cols-[180px_1fr_90px] items-center gap-3 rounded-lg border border-line bg-mist px-3 py-2 text-sm">
              <span className="font-semibold text-slate-600">{item.key}</span>
              <span className="font-medium text-ink">{item.value}</span>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Bật/tắt tính năng" subtitle="Điều khiển mô phỏng">
        <div className="grid gap-2">
          {["Cảnh báo QA", "Xuất BI", "Duyệt CMS", "Chế độ PWA", "Xem trước RAG"].map((toggle, index) => (
            <label key={toggle} className="flex items-center justify-between rounded-lg border border-line bg-mist px-3 py-2 text-sm">
              <span className="font-medium text-ink">{toggle}</span>
              <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4 accent-teal" />
            </label>
          ))}
        </div>
      </Panel>
    </div>
  );
}
