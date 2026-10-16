import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Bet } from "@shared/schema";

export type PeriodView = "month" | "year" | "all";

export interface Period {
  view: PeriodView;
  year: number;
  month: number; // 0-11
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function getPeriodLabel(period: Period): string {
  if (period.view === "all") return "All Time";
  if (period.view === "year") return period.year.toString();
  return `${MONTH_NAMES[period.month]} ${period.year}`;
}

export function getShortPeriodLabel(period: Period): string {
  if (period.view === "all") return "All Time";
  if (period.view === "year") return period.year.toString();
  return `${SHORT_MONTHS[period.month]} ${period.year}`;
}

export function filterBetsByPeriod<T extends Bet>(bets: T[], period: Period): T[] {
  if (period.view === "all") return bets;

  return bets.filter((bet) => {
    const [y, m] = bet.date.split("-").map(Number);
    if (period.view === "year") return y === period.year;
    return y === period.year && m - 1 === period.month;
  });
}

export function getCurrentPeriod(): Period {
  const now = new Date();
  return { view: "month", year: now.getFullYear(), month: now.getMonth() };
}

// Get available years from bets data
function getAvailableYears(bets: Bet[]): number[] {
  const years = new Set<number>();
  const now = new Date();
  years.add(now.getFullYear());
  bets.forEach((b) => {
    const y = parseInt(b.date.split("-")[0]);
    if (!isNaN(y)) years.add(y);
  });
  return Array.from(years).sort((a, b) => b - a);
}

function isCurrentMonth(period: Period): boolean {
  const now = new Date();
  return period.view === "month" && period.year === now.getFullYear() && period.month === now.getMonth();
}

export default function PeriodSelector({
  period,
  onChange,
  bets,
}: {
  period: Period;
  onChange: (p: Period) => void;
  bets: Bet[];
}) {
  const years = useMemo(() => getAvailableYears(bets), [bets]);

  const goToPreviousMonth = () => {
    if (period.month === 0) {
      onChange({ view: "month", year: period.year - 1, month: 11 });
    } else {
      onChange({ view: "month", year: period.year, month: period.month - 1 });
    }
  };

  const goToNextMonth = () => {
    if (period.month === 11) {
      onChange({ view: "month", year: period.year + 1, month: 0 });
    } else {
      onChange({ view: "month", year: period.year, month: period.month + 1 });
    }
  };

  const goToCurrentMonth = () => {
    onChange(getCurrentPeriod());
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="period-selector">
      {/* View tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            period.view === "month"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange({ ...period, view: "month" })}
          data-testid="tab-month"
        >
          Month
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium transition-colors border-x border-border ${
            period.view === "year"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange({ ...period, view: "year" })}
          data-testid="tab-year"
        >
          Year
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            period.view === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange({ ...period, view: "all" })}
          data-testid="tab-all"
        >
          All Time
        </button>
      </div>

      {/* Month navigator */}
      {period.view === "month" && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPreviousMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[130px] text-center tabular-nums" data-testid="text-period-label">
            {getPeriodLabel(period)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goToNextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth(period) && (
            <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={goToCurrentMonth} data-testid="button-current-month">
              <Calendar className="h-3 w-3 mr-1" />
              Today
            </Button>
          )}
        </div>
      )}

      {/* Year selector */}
      {period.view === "year" && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange({ ...period, year: period.year - 1 })}
            data-testid="button-prev-year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[50px] text-center tabular-nums" data-testid="text-year-label">
            {period.year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange({ ...period, year: period.year + 1 })}
            data-testid="button-next-year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
