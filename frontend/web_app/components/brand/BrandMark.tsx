export function BrandMark({ className = "h-9 w-9" }: Readonly<{ className?: string }>) {
  return (
    <div className={`relative inline-flex items-center justify-center rounded-lg bg-cyan-950 text-white shadow-sm ${className}`}>
      <svg viewBox="0 0 40 40" aria-label="Lumi logo" className="h-full w-full">
        <rect x="0" y="0" width="40" height="40" rx="8" fill="#0f4c81" />
        <path d="M12 10v19h12" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="12" r="4.5" fill="#22c55e" />
        <circle cx="28" cy="12" r="1.4" fill="#ecfeff" />
        <path
          d="M28 4.8v2M28 17v2M20.8 12h2M33 12h2M23 7l1.4 1.4M31.6 15.6 33 17"
          stroke="#d9f99d"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
