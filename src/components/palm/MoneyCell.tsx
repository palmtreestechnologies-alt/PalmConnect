export function formatMoney(amount: number, currency = "KES", locale = "en-KE") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function MoneyCell({ amount, currency = "KES" }: { amount: number; currency?: string }) {
  return <span className="tabular-nums font-medium">{formatMoney(amount, currency)}</span>;
}
