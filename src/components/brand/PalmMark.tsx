import { useId } from "react";
import { cn } from "@/lib/utils";

/** The Palm Connect mark: gold palm and arc over a blue Wi-Fi signal, in the official navy, gold and sky blue. */
export function PalmMark({ className, plain = false }: { className?: string; plain?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Palm Connect" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3CB6A" /><stop offset="1" stopColor="#C98B2D" />
        </linearGradient>
        <linearGradient id={`${id}n`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#06206B" /><stop offset="1" stopColor="#010321" />
        </linearGradient>
      </defs>
      {!plain && <rect width="64" height="64" rx="15" fill={`url(#${id}n)`} />}
      <path d="M45 9A27 27 0 0 0 10 47" fill="none" stroke={`url(#${id}g)`} strokeWidth="2.2" strokeLinecap="round" />
      <g fill={`url(#${id}g)`}>
        <path d="M30 29Q18 22 11 34Q20 29 30 29Z" />
        <path d="M30 29Q22 20 18 15Q28 20 30 29Z" />
        <path d="M30 29Q27 20 30 13Q33 20 30 29Z" />
        <path d="M30 29Q36 19 44 16Q38 24 30 29Z" />
        <path d="M30 29Q42 22 50 33Q41 29 30 29Z" />
      </g>
      <path d="M30 29Q27 33 28.5 38" fill="none" stroke={`url(#${id}g)`} strokeWidth="2.4" strokeLinecap="round" />
      <g fill="none" stroke="#27B4FC" strokeLinecap="round" strokeWidth="3">
        <path d="M17 46Q30 36 43 46" />
        <path d="M23 51Q30 45.5 37 51" />
      </g>
      <circle cx="30" cy="56" r="2.5" fill="#27B4FC" />
    </svg>
  );
}
