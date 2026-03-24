import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Bet } from "@shared/schema";
import KpiCards from "@/components/kpi-cards";
import BetForm from "@/components/bet-form";
import BetHistory from "@/components/bet-history";
import ProfitChart from "@/components/profit-chart";
import BreakdownCharts from "@/components/breakdown-charts";
import SettleBetDialog from "@/components/settle-bet-dialog";
import PeriodSelector, {
  type Period,
  getCurrentPeriod,
  filterBetsByPeriod,
  getShortPeriodLabel,
} from "@/components/period-selector";
import YearlySummary from "@/components/yearly-summary";
import { useTheme } from "@/components/theme-provider";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Button } from "@/components/ui/button";
import { Plus, Moon, Sun, TrendingUp, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { queryClient as qc } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    qc.clear();
  };
  const [addOpen, setAddOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlingBet, setSettlingBet] = useState<Bet | null>(null);
  const [period, setPeriod] = useState<Period>(getCurrentPeriod());

  const { data: allBets = [], isLoading } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
  });

  // Filter bets by selected period
  const bets = useMemo(() => filterBetsByPeriod(allBets, period), [allBets, period]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/bets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      setAddOpen(false);
      toast({ title: "Bet logged", description: "Your bet has been recorded." });
    },
  });

  const settleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; result: string; payout: number; profit: number }) => {
      const res = await apiRequest("PATCH", `/api/bets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      setSettleOpen(false);
      setSettlingBet(null);
      toast({ title: "Bet settled", description: "Result recorded." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      toast({ title: "Bet deleted" });
    },
  });

  const handleSettle = (bet: Bet) => {
    setSettlingBet(bet);
    setSettleOpen(true);
  };

  const handleSelectMonth = (month: number) => {
    setPeriod({ view: "month", year: period.year, month });
  };

  const isYearView = period.view === "year";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">BetTracker</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-user-name">
                {user.displayName}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-bet">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Log Bet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Log a New Bet</DialogTitle>
                </DialogHeader>
                <BetForm
                  onSubmit={(data) => createMutation.mutate(data)}
                  isPending={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
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
        <PerplexityAttribution />
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
