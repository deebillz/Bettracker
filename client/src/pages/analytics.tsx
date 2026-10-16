import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Flame, Snowflake, Trophy, TrendingDown, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import type { BetWithLegs } from "@shared/schema";
import AppHeader from "@/components/app-header";
import { ProfitLine, PeriodBars } from "@/components/analytics/charts";
import BreakdownTable from "@/components/analytics/breakdown-table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { betTypeLabel } from "@/lib/constants";
import { money, pct, signedMoney } from "@/lib/format";
import { formatAmericanOdds } from "@shared/odds";
import { cn } from "@/lib/utils";
import {
  DIMENSIONS,
  MIN_BETS_FOR_INSIGHT,
  RANGE_PRESETS,
  applyFilters,
  breakdown,
  bucketFor,
  cumulativeByDay,
  insights,
  previousRange,
  profitByPeriod,
  rangeFor,
  shortDate,
  streaks,
  summarize,
  type BoostFilter,
  type DateRange,
  type Dimension,
  type Filters,
  type RangePreset,
  type Summary,
} from "@/lib/analytics";

// Remember the last view on this device (a convenience; nothing breaks without it)
const PREFS_KEY = "bettracker-analytics";
interface Prefs {
  preset: RangePreset;
  custom: DateRange;
  sport: string;
  betType: string;
  sportsbook: string;
  boost: BoostFilter;
  compare: boolean;
  dimension: Dimension;
}
const DEFAULT_PREFS: Prefs = {
  preset: "30d",
  custom: { from: null, to: null },
  sport: "all",
  betType: "all",
  sportsbook: "all",
  boost: "all",
  compare: true,
  dimension: "sport",
};
function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

// ---------- Small pieces ----------

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testId: string;
  className?: string;
}) {
  return (
    <label className={cn("space-y-1", className)}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function Delta({ now, prev, kind }: { now: number | null; prev: number | null; kind: "money" | "points" | "count" }) {
  if (now === null || prev === null) return <span className="text-muted-foreground">no earlier data</span>;
  const d = now - prev;
  if (Math.abs(d) < (kind === "money" ? 0.005 : 0.05)) return <span className="text-muted-foreground">same as before</span>;
  const text =
    kind === "money" ? signedMoney(d, 0) : kind === "points" ? `${d > 0 ? "+" : ""}${d.toFixed(1)} pts` : `${d > 0 ? "+" : ""}${Math.round(d)}`;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" style={{ color: kind === "count" ? undefined : d > 0 ? "hsl(var(--gain))" : "hsl(var(--loss))" }} />
      <span className="text-foreground/80 tabular-nums">{text}</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  sub,
  delta,
  testId,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  delta?: React.ReactNode;
  testId: string;
}) {
  return (
    <Card className="p-4" data-testid={testId}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      {delta && <div className="mt-1.5 text-xs">{delta}</div>}
    </Card>
  );
}

function SectionCard({ title, subtitle, children, className, testId }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <Card className={cn("p-5", className)} data-testid={testId}>
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

// ---------- Page ----------

export default function AnalyticsPage() {
  const { data: allBets = [], isLoading } = useQuery<BetWithLegs[]>({ queryKey: ["/api/bets"] });
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // not saved; filters still work for this visit
    }
  }, [prefs]);

  const range = useMemo(() => rangeFor(prefs.preset, new Date(), prefs.custom), [prefs.preset, prefs.custom]);
  const prevRange = useMemo(() => previousRange(prefs.preset, range), [prefs.preset, range]);
  const filters: Filters = { range, sport: prefs.sport, betType: prefs.betType, sportsbook: prefs.sportsbook, boost: prefs.boost };

  const bets = useMemo(() => applyFilters(allBets, filters), [allBets, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevBets = useMemo(
    () => (prefs.compare && prevRange ? applyFilters(allBets, filters, prevRange) : null),
    [allBets, prefs.compare, JSON.stringify(prevRange), JSON.stringify(filters)], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const s = useMemo(() => summarize(bets), [bets]);
  const prev: Summary | null = useMemo(() => (prevBets ? summarize(prevBets) : null), [prevBets]);
  const hasPrev = !!prev && prev.settled > 0;
  const days = useMemo(() => cumulativeByDay(bets), [bets]);
  const bucket = useMemo(() => bucketFor(bets, range), [bets, range]);
  const periods = useMemo(() => profitByPeriod(bets, bucket), [bets, bucket]);
  const st = useMemo(() => streaks(bets), [bets]);
  const { leaks, strengths } = useMemo(() => insights(bets), [bets]);
  const rows = useMemo(() => breakdown(bets, prefs.dimension), [bets, prefs.dimension]);

  // Filter options come from the bets you've actually logged
  const uniq = (xs: (string | null)[]) => Array.from(new Set(xs.map((x) => x ?? "Other"))).sort();
  const sportOpts = [{ value: "all", label: "All sports" }, ...uniq(allBets.map((b) => b.sport)).map((v) => ({ value: v, label: v }))];
  const typeOpts = [{ value: "all", label: "All types" }, ...uniq(allBets.map((b) => b.betType)).map((v) => ({ value: v, label: betTypeLabel(v) }))];
  const bookOpts = [{ value: "all", label: "All books" }, ...uniq(allBets.map((b) => b.sportsbook)).map((v) => ({ value: v, label: v }))];

  const rangeLabel =
    range.from && range.to
      ? `${shortDate(range.from)} – ${shortDate(range.to)}`
      : range.from
        ? `Since ${shortDate(range.from)}`
        : range.to
          ? `Through ${shortDate(range.to)}`
          : "All time";
  const prevLabel = prevRange?.from && prevRange.to ? `${shortDate(prevRange.from)} – ${shortDate(prevRange.to)}` : "";
  const filtersActive = prefs.sport !== "all" || prefs.betType !== "all" || prefs.sportsbook !== "all" || prefs.boost !== "all";
  const dimLabel = DIMENSIONS.find((d) => d.value === prefs.dimension)!.label;

  const compareOn = prefs.compare && !!prevRange;
  const d = (now: number | null, before: number | null, kind: "money" | "points" | "count") =>
    compareOn ? <Delta now={hasPrev ? now : null} prev={hasPrev ? before : null} kind={kind} /> : undefined;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-range">
              {rangeLabel}
              {filtersActive && " · filtered"}
              {compareOn && prevLabel && ` · compared with ${prevLabel}`}
            </p>
          </div>
        </div>

        {/* One filter row scopes everything below */}
        <Card className="p-4" data-testid="card-filters">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 items-end">
            <FilterSelect
              label="Date range"
              value={prefs.preset}
              onChange={(v) => set("preset", v as RangePreset)}
              options={RANGE_PRESETS}
              testId="filter-range"
            />
            <FilterSelect label="Sport" value={prefs.sport} onChange={(v) => set("sport", v)} options={sportOpts} testId="filter-sport" />
            <FilterSelect label="Bet type" value={prefs.betType} onChange={(v) => set("betType", v)} options={typeOpts} testId="filter-type" />
            <FilterSelect label="Sportsbook" value={prefs.sportsbook} onChange={(v) => set("sportsbook", v)} options={bookOpts} testId="filter-book" />
            <FilterSelect
              label="Odds boost"
              value={prefs.boost}
              onChange={(v) => set("boost", v as BoostFilter)}
              options={[
                { value: "all", label: "All bets" },
                { value: "boosted", label: "Boosted only" },
                { value: "regular", label: "No boost" },
              ]}
              testId="filter-boost"
            />
            <label className="flex h-9 items-center justify-between gap-2 rounded-md border px-3 col-span-2 md:col-span-1">
              <span className={cn("text-sm", !prevRange && "text-muted-foreground")}>Compare</span>
              <Switch
                checked={compareOn}
                disabled={!prevRange}
                onCheckedChange={(v) => set("compare", v)}
                data-testid="switch-compare"
                aria-label="Compare with the previous period"
              />
            </label>
          </div>
          {prefs.preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
              <label className="space-y-1">
                <span className="block text-xs font-medium text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={prefs.custom.from ?? ""}
                  onChange={(e) => set("custom", { ...prefs.custom, from: e.target.value || null })}
                  data-testid="input-from"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-medium text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={prefs.custom.to ?? ""}
                  onChange={(e) => set("custom", { ...prefs.custom, to: e.target.value || null })}
                  data-testid="input-to"
                />
              </label>
            </div>
          )}
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : s.settled === 0 ? (
          <Card className="p-10 text-center" data-testid="analytics-empty">
            <p className="font-medium">No settled bets in this view</p>
            <p className="text-sm text-muted-foreground mt-1">
              {s.pending > 0
                ? `${s.pending} pending bet${s.pending === 1 ? "" : "s"} will show up here once settled.`
                : allBets.length > 0
                  ? "Try a longer date range or clear a filter."
                  : "Log and settle a few bets to see your analytics."}
            </p>
          </Card>
        ) : (
          <>
            {/* Headline numbers */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <StatTile label="Profit" value={signedMoney(s.profit)} sub={`${money(s.staked)} staked`} delta={d(s.profit, prev?.profit ?? null, "money")} testId="stat-profit" />
              <StatTile label="ROI" value={pct(s.roi, 1, true)} sub="Profit ÷ staked" delta={d(s.roi, prev?.roi ?? null, "points")} testId="stat-roi" />
              <StatTile
                label="Win rate"
                value={pct(s.winRate)}
                sub={`${s.wins}W - ${s.losses}L${s.pushes ? ` - ${s.pushes}P` : ""}`}
                delta={d(s.winRate, prev?.winRate ?? null, "points")}
                testId="stat-winrate"
              />
              <StatTile
                label="Settled bets"
                value={String(s.settled)}
                sub={s.pending ? `${s.pending} pending` : "none pending"}
                delta={d(s.settled, prev?.settled ?? null, "count")}
                testId="stat-bets"
              />
              <StatTile
                label="Avg stake"
                value={s.avgStake !== null ? money(s.avgStake) : "—"}
                sub={s.avgOdds !== null ? `Avg odds ${formatAmericanOdds(s.avgOdds)}` : undefined}
                delta={d(s.avgStake, prev?.avgStake ?? null, "money")}
                testId="stat-stake"
              />
              <StatTile
                label="Boosts added"
                value={signedMoney(s.boostProfit)}
                sub={`${s.boosted} boosted bet${s.boosted === 1 ? "" : "s"}`}
                delta={d(s.boostProfit, prev?.boostProfit ?? null, "money")}
                testId="stat-boosts"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <SectionCard title="Running profit" subtitle="Total profit after each day with settled bets" className="lg:col-span-3" testId="card-running">
                <ProfitLine points={days} />
              </SectionCard>

              <SectionCard title="Streaks" subtitle="In the order bets were placed; pushes don't count" className="lg:col-span-2" testId="card-streaks">
                <div className="grid grid-cols-2 gap-3">
                  <StreakItem
                    icon={st.current?.type === "W" ? Flame : Snowflake}
                    label="Current streak"
                    value={st.current ? `${st.current.count} ${st.current.type === "W" ? (st.current.count === 1 ? "win" : "wins") : st.current.count === 1 ? "loss" : "losses"}` : "—"}
                  />
                  <StreakItem icon={Trophy} label="Longest win streak" value={st.longestWin ? `${st.longestWin}` : "—"} />
                  <StreakItem icon={TrendingUp} label="Best day" value={st.bestDay ? signedMoney(st.bestDay.profit) : "—"} sub={st.bestDay ? shortDate(st.bestDay.date) : undefined} />
                  <StreakItem icon={TrendingDown} label="Worst day" value={st.worstDay ? signedMoney(st.worstDay.profit) : "—"} sub={st.worstDay ? shortDate(st.worstDay.date) : undefined} />
                  <StreakItem icon={Snowflake} label="Longest losing streak" value={st.longestLoss ? `${st.longestLoss}` : "—"} />
                  <StreakItem icon={Zap} label="Boost win rate" value={boostWinRate(bets)} />
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title={`Profit by ${bucket}`}
              subtitle={bucket === "week" ? "Weeks start on Monday" : undefined}
              testId="card-periods"
            >
              <PeriodBars points={periods} />
            </SectionCard>

            <SectionCard
              title="Where you win and lose"
              subtitle={`Groups with ${MIN_BETS_FOR_INSIGHT}+ settled bets and an ROI of at least ±10%`}
              testId="card-insights"
            >
              {s.settled < 10 ? (
                <p className="text-sm text-muted-foreground">Settle at least 10 bets in this view to spot patterns. You have {s.settled} so far.</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <InsightList title="Leaks" icon={AlertTriangle} items={leaks} empty="Nothing with enough bets is losing more than 10%." />
                  <InsightList title="Strengths" icon={Trophy} items={strengths} empty="Nothing with enough bets is winning more than 10% yet." />
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Breakdown"
              subtitle={
                prefs.dimension === "team"
                  ? "Single bets picked with the team picker; the first team is your pick"
                  : prefs.dimension === "legs"
                    ? "Parlays only"
                    : prefs.dimension === "odds"
                      ? "By the odds you got, before any boost"
                      : "Tap a column to sort"
              }
              testId="card-breakdown"
            >
              <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Break down by">
                {DIMENSIONS.map((dim) => (
                  <button
                    key={dim.value}
                    type="button"
                    role="tab"
                    aria-selected={prefs.dimension === dim.value}
                    onClick={() => set("dimension", dim.value)}
                    data-testid={`dim-${dim.value}`}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      prefs.dimension === dim.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {dim.label}
                  </button>
                ))}
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {prefs.dimension === "team"
                    ? "No bets with a team picked from the list in this view."
                    : prefs.dimension === "legs"
                      ? "No parlays in this view."
                      : "Nothing to show for this view."}
                </p>
              ) : (
                <BreakdownTable rows={rows} groupLabel={dimLabel} />
              )}
            </SectionCard>
          </>
        )}
      </main>
    </div>
  );
}

function boostWinRate(bets: BetWithLegs[]): string {
  const b = summarize(bets.filter((x) => x.boostPct));
  return b.winRate === null ? "—" : `${pct(b.winRate, 0)} (${b.wins}-${b.losses})`;
}

function StreakItem({ icon: Icon, label, value, sub }: { icon: typeof Flame; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function InsightList({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Flame;
  items: ReturnType<typeof insights>["leaks"];
  empty: string;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2" data-testid={`list-${title.toLowerCase()}`}>
          {items.map((i) => (
            <li key={i.dimension + i.key} className="rounded-lg border p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium truncate">
                  {i.key}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{i.dimension}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums whitespace-nowrap">{signedMoney(i.profit)}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {i.settled} bets · {i.wins}W-{i.losses}L · ROI {pct(i.roi, 0, true)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
