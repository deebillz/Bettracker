import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BetWithLegs } from "@shared/schema";
import KpiCards from "@/components/kpi-cards";
import BetHistory from "@/components/bet-history";
import ProfitChart from "@/components/profit-chart";
import BreakdownCharts from "@/components/breakdown-charts";
import SettleBetDialog, { type SettleInput } from "@/components/settle-bet-dialog";
import PeriodSelector, {
  type Period,
  getCurrentPeriod,
  filterBetsByPeriod,
} from "@/components/period-selector";
import YearlySummary from "@/components/yearly-summary";
import AppHeader from "@/components/app-header";

export default function Dashboard() {
  const { toast, dismiss } = useToast();
  const onError = (err: Error) =>
    toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlingBet, setSettlingBet] = useState<BetWithLegs | null>(null);
  const [period, setPeriod] = useState<Period>(getCurrentPeriod());

  const { data: allBets = [], isLoading } = useQuery<BetWithLegs[]>({
    queryKey: ["/api/bets"],
  });

  // Filter bets by selected period
  const bets = useMemo(() => filterBetsByPeriod(allBets, period), [allBets, period]);

  const settleMutation = useMutation({
    mutationFn: async ({ id, ...data }: SettleInput) => {
      const res = await apiRequest("POST", `/api/bets/${id}/settle`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      setSettleOpen(false);
      setSettlingBet(null);
      toast({ title: "Bet settled", description: "Result recorded." });
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      toast({ title: "Bet deleted" });
    },
    onError,
  });

  const handleSettle = (bet: BetWithLegs) => {
    dismiss();
    setSettlingBet(bet);
    setSettleOpen(true);
  };

  const handleSelectMonth = (month: number) => {
    setPeriod({ view: "month", year: period.year, month });
  };

  const isYearView = period.view === "year";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Period selector */}
        <PeriodSelector period={period} onChange={setPeriod} bets={allBets} />

        {/* KPIs — always show for selected period */}
        <KpiCards bets={bets} isLoading={isLoading} />

        {/* Year view: show monthly breakdown table */}
        {isYearView ? (
          <YearlySummary bets={allBets} period={period} onSelectMonth={handleSelectMonth} />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <ProfitChart bets={bets} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-2">
                <BreakdownCharts bets={bets} isLoading={isLoading} />
              </div>
            </div>
          </>
        )}

        <BetHistory
          bets={bets}
          isLoading={isLoading}
          onSettle={handleSettle}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </main>

      <SettleBetDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        bet={settlingBet}
        onSettle={(data) => settleMutation.mutate(data)}
        isPending={settleMutation.isPending}
      />
    </div>
  );
}
