import { useMemo } from "react";
import type { Bet } from "@shared/schema";
import { Card } from "@/components/ui/card";
import type { Period } from "./period-selector";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MonthSummary {
  month: number;
  label: string;
  bets: number;
  settled: number;
  wins: number;
  losses: number;
  staked: number;
  profit: number;
  roi: number;
}

function formatCurrency(n: number): string {
  const prefix = n >= 0 ? "+$" : "-$";
  return prefix + Math.abs(n).toFixed(2);
}

export default function YearlySummary({
  bets,
  period,
  onSelectMonth,
}: {
  bets: Bet[];
  period: Period;
  onSelectMonth: (month: number) => void;
}) {
  const monthData = useMemo(() => {
    const months: MonthSummary[] = [];

    for (let m = 0; m < 12; m++) {
      const monthBets = bets.filter((b) => {
        const [y, mo] = b.date.split("-").map(Number);
        return y === period.year && mo - 1 === m;
      });

      const settled = monthBets.filter((b) => b.result !== "pending");
      const wins = settled.filter((b) => b.result === "won").length;
      const losses = settled.filter((b) => b.result === "lost").length;
      const staked = settled.reduce((s, b) => s + b.stake, 0);
      const profit = settled.reduce((s, b) => s + (b.profit ?? 0), 0);
      const roi = staked > 0 ? (profit / staked) * 100 : 0;

      months.push({
        month: m,
        label: MONTH_NAMES[m],
        bets: monthBets.length,
        settled: settled.length,
        wins,
        losses,
        staked,
        profit,
        roi,
      });
    }

    return months;
  }, [bets, period.year]);

  // Year totals
  const yearTotals = useMemo(() => {
    const allSettled = bets.filter((b) => {
      const y = parseInt(b.date.split("-")[0]);
      return y === period.year && b.result !== "pending";
    });
    const totalStaked = allSettled.reduce((s, b) => s + b.stake, 0);
    const totalProfit = allSettled.reduce((s, b) => s + (b.profit ?? 0), 0);
    const totalWins = allSettled.filter((b) => b.result === "won").length;
    const totalLosses = allSettled.filter((b) => b.result === "lost").length;
    const totalBets = bets.filter((b) => parseInt(b.date.split("-")[0]) === period.year).length;
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

    return { totalBets, settled: allSettled.length, totalWins, totalLosses, totalStaked, totalProfit, roi };
  }, [bets, period.year]);

  // Find max absolute profit for bar scaling
  const maxAbsProfit = useMemo(() => {
    const vals = monthData.map((m) => Math.abs(m.profit));
    return Math.max(...vals, 1);
  }, [monthData]);

  return (
    <Card className="p-4 sm:p-6" data-testid="yearly-summary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{period.year} Year Summary</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{yearTotals.totalBets} bets</span>
          <span>{yearTotals.totalWins}W - {yearTotals.totalLosses}L</span>
          <span className={`font-semibold ${yearTotals.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {formatCurrency(yearTotals.totalProfit)}
          </span>
          <span className={`font-semibold ${yearTotals.roi >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {yearTotals.roi >= 0 ? "+" : ""}{yearTotals.roi.toFixed(1)}% ROI
          </span>
        </div>
      </div>

      {/* Month-by-month rows */}
      <div className="space-y-1">
        {monthData.map((m) => {
          const barWidth = maxAbsProfit > 0 ? (Math.abs(m.profit) / maxAbsProfit) * 100 : 0;
          const hasData = m.bets > 0;
          const now = new Date();
          const isCurrent = period.year === now.getFullYear() && m.month === now.getMonth();

          return (
            <button
              key={m.month}
              type="button"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                hasData
                  ? "hover:bg-muted/60 cursor-pointer"
                  : "opacity-40 cursor-default"
              } ${isCurrent ? "bg-muted/40 ring-1 ring-primary/20" : ""}`}
              onClick={() => hasData && onSelectMonth(m.month)}
              disabled={!hasData}
              data-testid={`month-row-${m.month}`}
            >
              <span className="text-xs font-medium w-8 text-muted-foreground">{m.label}</span>

              {/* Record */}
              <span className="text-xs tabular-nums w-14 text-muted-foreground">
                {hasData ? `${m.wins}W-${m.losses}L` : "—"}
              </span>

              {/* Profit bar */}
              <div className="flex-1 flex items-center h-5">
                {hasData && m.settled > 0 ? (
                  <div className="w-full flex items-center">
                    <div className="w-1/2 flex justify-end">
                      {m.profit < 0 && (
                        <div
                          className="h-4 rounded-l-sm bg-red-500/70"
                          style={{ width: `${barWidth}%` }}
                        />
                      )}
                    </div>
                    <div className="w-px h-5 bg-border shrink-0" />
                    <div className="w-1/2">
                      {m.profit >= 0 && m.profit > 0 && (
                        <div
                          className="h-4 rounded-r-sm bg-emerald-500/70"
                          style={{ width: `${barWidth}%` }}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex items-center">
                    <div className="w-1/2" />
                    <div className="w-px h-5 bg-border/40 shrink-0" />
                    <div className="w-1/2" />
                  </div>
                )}
              </div>

              {/* P/L value */}
              <span className={`text-xs font-semibold tabular-nums w-20 text-right ${
                !hasData || m.settled === 0
                  ? "text-muted-foreground"
                  : m.profit >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
              }`}>
                {hasData && m.settled > 0 ? formatCurrency(m.profit) : "—"}
              </span>

              {/* ROI */}
              <span className={`text-xs tabular-nums w-16 text-right ${
                !hasData || m.settled === 0
                  ? "text-muted-foreground"
                  : m.roi >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
              }`}>
                {hasData && m.settled > 0 ? `${m.roi >= 0 ? "+" : ""}${m.roi.toFixed(1)}%` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
