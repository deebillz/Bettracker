import type { Bet } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Target, TrendingUp, Percent } from "lucide-react";

function formatCurrency(n: number): string {
  const prefix = n >= 0 ? "+$" : "-$";
  return prefix + Math.abs(n).toFixed(2);
}

export default function KpiCards({ bets, isLoading }: { bets: Bet[]; isLoading: boolean }) {
  const settled = bets.filter((b) => b.result !== "pending");
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const totalProfit = settled.reduce((s, b) => s + (b.profit ?? 0), 0);
  const wins = settled.filter((b) => b.result === "won").length;
  const losses = settled.filter((b) => b.result === "lost").length;
  // Pushes are neither wins nor losses, so they are left out of the win rate
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const pending = bets.filter((b) => b.result === "pending").length;

  const cards = [
    {
      label: "Total P/L",
      value: formatCurrency(totalProfit),
      delta: totalProfit >= 0 ? "positive" : "negative",
      sub: `$${totalStaked.toFixed(2)} staked`,
      icon: DollarSign,
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      delta: winRate >= 50 ? "positive" : winRate > 0 ? "negative" : "neutral",
      sub: `${wins}W - ${losses}L${pending > 0 ? ` (${pending} pending)` : ""}`,
      icon: Target,
    },
    {
      label: "ROI",
      value: `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`,
      delta: roi >= 0 ? "positive" : "negative",
      sub: "Return on investment",
      icon: TrendingUp,
    },
    {
      label: "Total Bets",
      value: bets.length.toString(),
      delta: "neutral",
      sub: `${settled.length} settled · ${pending} pending`,
      icon: Percent,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-28 mb-2" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 relative overflow-hidden" data-testid={`kpi-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
            <c.icon className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <p
            className={`text-xl font-bold tracking-tight ${
              c.delta === "positive"
                ? "text-emerald-500"
                : c.delta === "negative"
                ? "text-red-500"
                : "text-foreground"
            }`}
          >
            {c.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
        </Card>
      ))}
    </div>
  );
}
