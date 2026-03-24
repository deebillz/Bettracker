import { useMemo } from "react";
import type { Bet } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "hsl(155, 72%, 44%)",
  "hsl(200, 70%, 55%)",
  "hsl(45, 93%, 58%)",
  "hsl(0, 72%, 55%)",
  "hsl(280, 60%, 60%)",
  "hsl(30, 80%, 55%)",
  "hsl(320, 50%, 55%)",
];

export default function BreakdownCharts({ bets, isLoading }: { bets: Bet[]; isLoading: boolean }) {
  const sportBreakdown = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; profit: number; count: number }>();
    for (const bet of bets) {
      if (bet.result === "pending") continue;
      const entry = map.get(bet.sport) ?? { wins: 0, losses: 0, profit: 0, count: 0 };
      entry.count++;
      if (bet.result === "won") entry.wins++;
      if (bet.result === "lost") entry.losses++;
      entry.profit += bet.profit ?? 0;
      map.set(bet.sport, entry);
    }
    return Array.from(map, ([name, data]) => ({
      name,
      ...data,
      winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [bets]);

  const betTypeBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; profit: number }>();
    for (const bet of bets) {
      if (bet.result === "pending") continue;
      const entry = map.get(bet.betType) ?? { count: 0, profit: 0 };
      entry.count++;
      entry.profit += bet.profit ?? 0;
      map.set(bet.betType, entry);
    }
    return Array.from(map, ([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...data,
      profit: Math.round(data.profit * 100) / 100,
    })).sort((a, b) => b.count - a.count);
  }, [bets]);

  if (isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-[260px] w-full" />
      </Card>
    );
  }

  const hasData = sportBreakdown.length > 0;

  return (
    <div className="space-y-6">
      {/* Sport Breakdown - Pie */}
      <Card className="p-5" data-testid="card-sport-breakdown">
        <h2 className="text-base font-semibold mb-4">By Sport</h2>
        {!hasData ? (
          <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
            No settled bets yet.
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={sportBreakdown}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  animationDuration={600}
                >
                  {sportBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {sportBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-muted-foreground">{s.winRate}% WR</span>
                    <span className={s.profit >= 0 ? "text-emerald-500" : "text-red-500"}>
                      {s.profit >= 0 ? "+" : ""}${s.profit.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Bet Type Breakdown - Bar */}
      <Card className="p-5" data-testid="card-type-breakdown">
        <h2 className="text-base font-semibold mb-4">By Bet Type</h2>
        {betTypeBreakdown.length === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
            No settled bets yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={betTypeBreakdown} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "P/L"]}
              />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]} animationDuration={600}>
                {betTypeBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.profit >= 0 ? "hsl(155, 72%, 44%)" : "hsl(0, 72%, 55%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
