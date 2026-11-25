import { cn } from "@/lib/utils";

/** The Palm Connect mark: Wi-Fi signal rising from a palm crown, gold on deep green. */
export function PalmMark({ className, plain = false }: { className?: string; plain?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Palm Connect" className={cn("shrink-0", className)}>
      {!plain && <rect width="64" height="64" rx="15" fill="#0B3B2B" />}
      <g fill="none" stroke="#E8B53A" strokeLinecap="round">
        <path d="M21.5 20.5a14.5 14.5 0 0 1 21 0" strokeWidth="3.4" />
        <path d="M15.5 14.5a23 23 0 0 1 33 0" strokeWidth="3.4" opacity=".6" />
        <path d="M32 35c-5.5-5.5-12-5-17 .5" strokeWidth="3.6" />
        <path d="M32 35c5.5-5.5 12-5 17 .5" strokeWidth="3.6" />
        <path d="M32 35c.4 7 1.2 13 1 20" strokeWidth="3.8" />
      </g>
      <circle cx="32" cy="29.5" r="3.3" fill="#E8B53A" />
    </svg>
  );
}
