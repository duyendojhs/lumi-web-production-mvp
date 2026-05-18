"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  FileSearch,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  MonitorCog,
  PanelsTopLeft,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";

interface AppFrameProps {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  rightRailTitle?: string;
  contentClassName?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface MeResponse {
  authenticated: boolean;
  user?: {
    email?: string;
    role?: "user" | "admin";
    displayName?: string;
  } | null;
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Hỏi đáp",
    items: [
      { href: "/", label: "Lumi Chat", icon: MessageSquareText, description: "Hỏi đáp có kiểm chứng nguồn" },
      { href: "/login", label: "Đăng nhập", icon: LogIn, description: "Phiên Supabase Auth" },
    ],
  },
  {
    label: "Tri thức",
    items: [
      { href: "/sources", label: "Nguồn", icon: FileSearch, description: "Thư viện tài liệu và chunks RAG" },
      { href: "/data-layer", label: "Lớp dữ liệu", icon: Database, description: "Catalog, chunks, lineage, chất lượng" },
    ],
  },
  {
    label: "Vận hành",
    items: [
      { href: "/dashboard", label: "Điều hành", icon: LayoutDashboard, description: "Sức khỏe hệ thống" },
      { href: "/qa", label: "QA/QC", icon: ShieldCheck, description: "Kiểm thử dữ liệu, model, runtime" },
      { href: "/cms", label: "CMS", icon: PanelsTopLeft, description: "Vận hành nguồn và nội dung" },
      { href: "/platforms", label: "Nền tảng", icon: MonitorCog, description: "Deploy, API, PWA, worker" },
      { href: "/bi", label: "BI", icon: BarChart3, description: "Chỉ số sử dụng và chất lượng" },
    ],
  },
];

export function AppFrame({
  children,
  rightRail,
  rightRailTitle = "Nguồn và ngữ cảnh",
  contentClassName = "",
}: Readonly<AppFrameProps>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const gridClass = rightRail
    ? "lg:grid-cols-[264px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)_340px]"
    : "lg:grid-cols-[264px_minmax(0,1fr)]";

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: MeResponse) => {
        if (active) setMe(data);
      })
      .catch(() => {
        if (active) setMe({ authenticated: false });
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-line text-slate-700"
          aria-label="Mở điều hướng"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <AppLogo compact />
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
          Web
        </span>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" role="presentation">
          <aside className="h-full w-[min(320px,88vw)] overflow-y-auto border-r border-line bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <AppLogo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-700"
                aria-label="Đóng điều hướng"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Navigation pathname={pathname} />
            <AuthMenu me={me} />
            <RuntimeNote />
          </aside>
        </div>
      ) : null}

      <div className={`mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-[1880px] grid-cols-1 lg:min-h-screen ${gridClass}`}>
        <aside className="hidden min-h-screen border-r border-line bg-white px-4 py-5 lg:block">
          <Link href="/" className="flex items-center gap-3" aria-label="Lumi home">
            <AppLogo />
          </Link>
          <Navigation pathname={pathname} />
          <AuthMenu me={me} />
          <RuntimeNote />
        </aside>

        <section className={`min-w-0 px-3 py-3 sm:px-4 lg:px-5 ${contentClassName}`}>{children}</section>

        {rightRail ? (
          <aside className="hidden min-h-screen overflow-y-auto border-l border-line bg-white px-4 py-5 xl:block">
            {rightRail}
          </aside>
        ) : null}

        {rightRail ? (
          <section className="border-t border-line bg-white px-3 py-3 sm:px-4 lg:hidden">
            <details className="rounded-lg border border-line bg-mist p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{rightRailTitle}</summary>
              <div className="mt-3">{rightRail}</div>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Navigation({ pathname }: Readonly<{ pathname: string }>) {
  return (
    <nav className="mt-6 grid gap-5" aria-label="Điều hướng chính">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
          <div className="mt-2 grid gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-teal text-white shadow-sm"
                      : "text-slate-700 hover:bg-mist hover:text-ink"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.label}</span>
                    <span className={`mt-0.5 block truncate text-xs ${active ? "text-teal-50" : "text-slate-500"}`}>
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AuthMenu({ me }: Readonly<{ me: MeResponse | null }>) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (!me) {
    return (
      <div className="mt-6 rounded-lg border border-line bg-mist p-3 text-xs text-slate-600">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!me.authenticated) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-teal hover:bg-mist"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Đăng nhập
      </Link>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-line bg-mist p-3">
      <div className="flex items-start gap-2">
        <UserCircle2 className="mt-0.5 h-4 w-4 flex-none text-teal" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{me.user?.displayName || me.user?.email || "Lumi user"}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{me.user?.role ?? "user"}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        disabled={isLoggingOut}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:text-ink disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
    </div>
  );
}

function RuntimeNote() {
  return (
    <div className="mt-6 rounded-lg border border-line bg-mist p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">App shell production</p>
        <span className="h-2 w-2 rounded-full bg-teal" aria-hidden="true" />
      </div>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
        <p>LLM key chỉ dùng ở server route.</p>
        <p>Production đọc DB/storage managed, không phụ thuộc dữ liệu local.</p>
        <p>Dashboard quản trị dùng dữ liệu pipeline thật khi có output.</p>
      </div>
    </div>
  );
}
