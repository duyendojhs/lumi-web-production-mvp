"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, LogIn } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    setNextPath(next?.startsWith("/") ? next : "/");
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Không đăng nhập được.");
      }
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không đăng nhập được.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppFrame>
      <div className="mx-auto max-w-xl rounded-lg border border-line bg-white p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal text-white">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ink">Đăng nhập Lumi</h1>
            <p className="text-sm text-slate-500">Dùng tài khoản Supabase Auth để truy cập workspace và khu vực quản trị.</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-ink">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-line bg-mist px-3 py-2 text-sm"
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Mật khẩu
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-line bg-mist px-3 py-2 text-sm"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        {status ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{status}</span>
          </div>
        ) : null}
      </div>
    </AppFrame>
  );
}
