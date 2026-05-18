import { BrandMark } from "./BrandMark";

export function AppLogo({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark className={compact ? "h-8 w-8" : "h-10 w-10"} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink sm:text-base">Lumi</div>
        {!compact ? <div className="truncate text-xs text-slate-500">AI platform workspace</div> : null}
      </div>
    </div>
  );
}
