import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GroupRow } from "@/lib/analytics";
import { money, pct, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "settled" | "winRate" | "profit" | "roi";

/** Profit as a bar from a center line: right for gains, left for losses. */
function ProfitBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.max(2, (Math.abs(value) / max) * 50) : 0;
  return (
    <div className="relative h-2 w-20 shrink-0 hidden sm:block" aria-hidden>
      <div className="absolute left-1/2 top-[-2px] bottom-[-2px] w-px bg-muted-foreground/50" />
      {value !== 0 && (
        <div
          className="absolute top-0 h-2"
          style={{
            width: `${w}%`,
            left: value > 0 ? "50%" : `${50 - w}%`,
            background: value > 0 ? "hsl(var(--gain))" : "hsl(var(--loss))",
            borderRadius: value > 0 ? "0 4px 4px 0" : "4px 0 0 4px",
          }}
        />
      )}
    </div>
  );
}

export default function BreakdownTable({ rows, groupLabel }: { rows: GroupRow[]; groupLabel: string }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows; // the breakdown's own order (natural order or most profitable first)
    const val = (r: GroupRow) => r[sort.key] ?? -Infinity;
    return [...rows].sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)));
  }, [rows, sort]);

  const max = Math.max(0, ...rows.map((r) => Math.abs(r.profit)));

  const header = (key: SortKey, label: string, className?: string) => {
    const active = sort?.key === key;
    return (
      <TableHead className={cn("text-xs text-right px-2 sm:px-4", className)}>
        <button
          type="button"
          className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
          onClick={() => setSort((s) => (s?.key === key ? { key, desc: !s.desc } : { key, desc: true }))}
          aria-label={`Sort by ${label}`}
        >
          {label}
          {active && (sort!.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
        </button>
      </TableHead>
    );
  };

  return (
    <div className="overflow-x-auto -mx-5">
      <Table data-testid="table-breakdown">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5 text-xs">{groupLabel}</TableHead>
            {header("settled", "Bets")}
            <TableHead className="text-xs text-right hidden sm:table-cell">Record</TableHead>
            {header("winRate", "Win %", "hidden sm:table-cell")}
            <TableHead className="text-xs text-right hidden md:table-cell">Staked</TableHead>
            {header("profit", "Profit")}
            {header("roi", "ROI", "pr-5")}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="pl-5 pr-2 sm:pr-4 text-sm font-medium sm:max-w-[240px]" title={r.key}>
                {r.key}
                <div className="text-xs font-normal text-muted-foreground">
                  <span className="sm:hidden">
                    {r.wins}-{r.losses}
                    {r.pushes > 0 ? `-${r.pushes}` : ""} · {pct(r.winRate, 0)} wins
                    {r.pending > 0 ? " · " : ""}
                  </span>
                  {r.pending > 0 && <span>{r.pending} pending</span>}
                </div>
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums px-2 sm:px-4">{r.settled}</TableCell>
              <TableCell className="text-sm text-right tabular-nums whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                {r.wins}-{r.losses}
                {r.pushes > 0 ? `-${r.pushes}` : ""}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{pct(r.winRate, 0)}</TableCell>
              <TableCell className="text-sm text-right tabular-nums hidden md:table-cell text-muted-foreground">
                {money(r.staked, 0)}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums px-2 sm:px-4">
                <div className="flex items-center justify-end gap-3">
                  <ProfitBar value={r.profit} max={max} />
                  <span className="sm:w-[84px] font-medium whitespace-nowrap">{signedMoney(r.profit)}</span>
                </div>
              </TableCell>
              <TableCell className="pl-2 pr-5 sm:pl-4 text-sm text-right tabular-nums whitespace-nowrap">{pct(r.roi, 0, true)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
