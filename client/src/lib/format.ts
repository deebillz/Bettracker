/** $1,234.56 */
export function money(n: number, decimals = 2): string {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** +$1,234.56 / -$12.00 — the sign is always shown so gains and losses never rely on color alone */
export function signedMoney(n: number, decimals = 2): string {
  const v = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return `${v > 0 ? "+" : v < 0 ? "-" : ""}${money(v, decimals)}`;
}

/** Axis ticks: -$1.2k, $0, $350 */
export function axisMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  return a >= 1000 ? `${sign}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${sign}$${Math.round(a)}`;
}

export function pct(n: number | null, decimals = 1, signed = false): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const s = n.toFixed(decimals);
  return `${signed && n > 0 ? "+" : ""}${s}%`;
}
