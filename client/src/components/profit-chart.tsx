import { useMemo } from "react";
import type { Bet } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProfitChart({ bets, isLoading }: { bets: Bet[]; isLoading: boolean }) {
  const chartData = useMemo(() => {
    const settled = bets
      .filter((b) => b.result !== "pending" && b.profit != null)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

    if (settled.length === 0) return [];

    let cumulative = 0;
    const points: { date: string; profit: number; cumulative: number }[] = [];

    // Group by date
    const grouped = new Map<string, number>();
    for (const bet of settled) {
      const existing = grouped.get(bet.date) ?? 0;
      grouped.set(bet.date, existing + (bet.profit ?? 0));
    }

    for (const [date, dayProfit] of grouped) {
      cumulative += dayProfit;
      points.push({
        date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        profit: dayProfit,
        cumulative: Math.round(cumulative * 100) / 100,
      });
    }

    return points;
  }, [bets]);

  if (isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[260px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="card-profit-chart">
      <h2 className="text-base font-semibold mb-4">Cumulative P/L</h2>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
          Settle some bets to see your P/L trend.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(155, 72%, 44%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(155, 72%, 44%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v < 0 ? "-" : ""}$${Math.abs(v)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 600 }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Cumulative P/L"]}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(155, 72%, 44%)"
              strokeWidth={2}
              fill="url(#profitGradient)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
