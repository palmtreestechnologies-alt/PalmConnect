export function RelativeTime({ date }: { date: string | Date | null | undefined }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < 60) text = `${Math.round(diff)}s ago`;
  else if (abs < 3600) text = `${Math.round(diff / 60)}m ago`;
  else if (abs < 86400) text = `${Math.round(diff / 3600)}h ago`;
  else text = `${Math.round(diff / 86400)}d ago`;
  return <time dateTime={d.toISOString()} title={d.toLocaleString()}>{text}</time>;
}
