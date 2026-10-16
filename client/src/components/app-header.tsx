import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Plus, Moon, Sun, TrendingUp, LogOut, LayoutDashboard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BetForm from "@/components/bet-form";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, testId: "tab-dashboard" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, testId: "tab-analytics" },
];

function NavTabs({ className }: { className?: string }) {
  const [location] = useLocation();
  return (
    <nav className={cn("flex rounded-lg bg-muted p-1", className)} aria-label="Main">
      {TABS.map((t) => {
        const active = location === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            data-testid={t.testId}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Top bar shared by every page: navigation, theme, sign out and the Log Bet form. */
export default function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { toast, dismiss } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await apiRequest("POST", "/api/bets", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      setAddOpen(false);
      toast({ title: "Bet logged", description: "Your bet has been recorded." });
    },
    onError: (err: Error) => toast({ title: "Something went wrong", description: err.message, variant: "destructive" }),
  });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">
            BetTracker
          </h1>
        </div>

        <NavTabs className="hidden sm:flex w-[280px]" />

        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-muted-foreground hidden lg:inline" data-testid="text-user-name">
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
          <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              if (open) dismiss(); // clear any confirmation so it can't cover the form
              setAddOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-bet">
                <Plus className="mr-1.5 h-4 w-4" />
                Log Bet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log a New Bet</DialogTitle>
              </DialogHeader>
              <BetForm onSubmit={(data) => createMutation.mutate(data)} isPending={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="px-4 pb-2.5 sm:hidden">
        <NavTabs />
      </div>
    </header>
  );
}
