// Pure analytics over the user's bets. No React here, so it's easy to test.
// Relative imports (not "@/") so the Node test runner can load this file directly.
import type { BetWithLegs } from "../../../shared/schema";
import { calcWin, americanToDecimal, decimalToAmerican } from "../../../shared/odds";
import { TEAMS_BY_SPORT } from "../data/teams";

// ---------- Dates (bets store local calendar dates as "YYYY-MM-DD") ----------

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // noon avoids DST edge cases
}

function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export type RangePreset = "7d" | "30d" | "90d" | "month" | "lastMonth" | "year" | "all" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

/** Inclusive date range; null bounds mean open-ended. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

export function rangeFor(preset: RangePreset, today: Date = new Date(), custom?: DateRange): DateRange {
  const t = toISODate(today);
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case "7d":
      return { from: addDays(t, -6), to: t };
    case "30d":
      return { from: addDays(t, -29), to: t };
    case "90d":
      return { from: addDays(t, -89), to: t };
    case "month":
      return { from: toISODate(new Date(y, m, 1, 12)), to: t };
    case "lastMonth":
      return { from: toISODate(new Date(y, m - 1, 1, 12)), to: toISODate(new Date(y, m, 0, 12)) };
    case "year":
      return { from: `${y}-01-01`, to: t };
    case "custom":
      return { from: custom?.from || null, to: custom?.to || null };
    default:
      return { from: null, to: null };
  }
}

/**
 * The period to compare against: the same stretch of time just before.
 * "This month" (Oct 1-16) compares with Sep 1-16, "This year" with the same
 * days last year, rolling ranges with the equal-length window before them.
 */
export function previousRange(preset: RangePreset, range: DateRange): DateRange | null {
  if (!range.from || !range.to) return null;
  if (preset === "month" || preset === "lastMonth") {
    const f = parseISO(range.from);
    const t = parseISO(range.to);
    const pf = new Date(f.getFullYear(), f.getMonth() - 1, 1, 12);
    const lastDayPrev = new Date(f.getFullYear(), f.getMonth(), 0, 12).getDate();
    const pt = new Date(pf.getFullYear(), pf.getMonth(), Math.min(t.getDate(), lastDayPrev), 12);
    return { from: toISODate(pf), to: toISODate(pt) };
  }
  if (preset === "year") {
    const f = parseISO(range.from);
    const t = parseISO(range.to);
    return {
      from: toISODate(new Date(f.getFullYear() - 1, f.getMonth(), f.getDate(), 12)),
      to: toISODate(new Date(t.getFullYear() - 1, t.getMonth(), t.getDate(), 12)),
    };
  }
  const len = daysBetween(range.from, range.to) + 1;
  return { from: addDays(range.from, -len), to: addDays(range.from, -1) };
}

// ---------- Filters ----------

export type BoostFilter = "all" | "boosted" | "regular";

export interface Filters {
  range: DateRange;
  sport: string; // "all" or a sport
  betType: string; // "all" or a type
  sportsbook: string; // "all" or a book
  boost: BoostFilter;
}

export function inRange(date: string, r: DateRange): boolean {
  return (!r.from || date >= r.from) && (!r.to || date <= r.to);
}

export function applyFilters(bets: BetWithLegs[], f: Filters, range: DateRange = f.range): BetWithLegs[] {
  return bets.filter(
    (b) =>
      inRange(b.date, range) &&
      (f.sport === "all" || b.sport === f.sport) &&
      (f.betType === "all" || b.betType === f.betType) &&
      (f.sportsbook === "all" || (b.sportsbook ?? "Other") === f.sportsbook) &&
      (f.boost === "all" || (f.boost === "boosted" ? !!b.boostPct : !b.boostPct)),
  );
}

// ---------- Summaries ----------

export interface Summary {
  bets: number; // all bets in the slice, including pending
  settled: number;
  pending: number;
  wins: number;
  losses: number;
  pushes: number;
  staked: number; // settled stakes only
  profit: number;
  roi: number | null; // profit / staked, as a %
  winRate: number | null; // wins / (wins + losses), pushes excluded, as a %
  avgStake: number | null;
  avgOdds: number | null; // average price, as American odds
  boosted: number; // settled bets that used a boost
  boostProfit: number; // extra winnings the boosts added on winning bets
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function summarize(bets: BetWithLegs[]): Summary {
  const settled = bets.filter((b) => b.result !== "pending");
  const wins = settled.filter((b) => b.result === "won").length;
  const losses = settled.filter((b) => b.result === "lost").length;
  const pushes = settled.filter((b) => b.result === "push").length;
  const staked = settled.reduce((s, b) => s + b.stake, 0);
  const profit = settled.reduce((s, b) => s + (b.profit ?? 0), 0);
  const avgDec = settled.length ? settled.reduce((s, b) => s + americanToDecimal(b.odds), 0) / settled.length : null;
  const boostedBets = settled.filter((b) => b.boostPct);
  const boostProfit = boostedBets
    .filter((b) => b.result === "won")
    .reduce((s, b) => s + calcWin(b).bonusWin, 0);
  return {
    bets: bets.length,
    settled: settled.length,
    pending: bets.length - settled.length,
    wins,
    losses,
    pushes,
    staked: r2(staked),
    profit: r2(profit),
    roi: staked > 0 ? (profit / staked) * 100 : null,
    winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
    avgStake: settled.length ? r2(staked / settled.length) : null,
    avgOdds: avgDec ? decimalToAmerican(avgDec) : null,
    boosted: boostedBets.length,
    boostProfit: r2(boostProfit),
  };
}

// ---------- Breakdowns ----------

export type Dimension = "sport" | "betType" | "sportsbook" | "team" | "odds" | "weekday" | "legs" | "boost";

export const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "sport", label: "Sport" },
  { value: "betType", label: "Bet type" },
  { value: "sportsbook", label: "Sportsbook" },
  { value: "team", label: "Team" },
  { value: "odds", label: "Odds range" },
  { value: "weekday", label: "Day of week" },
  { value: "legs", label: "Parlay legs" },
  { value: "boost", label: "Boosted" },
];

export const ODDS_BUCKETS = [
  { label: "Big favorite (-200 or shorter)", test: (o: number) => o <= -200 },
  { label: "Favorite (-199 to -101)", test: (o: number) => o > -200 && o < -100 },
  { label: "Near even (-100 to +149)", test: (o: number) => o >= 100 ? o < 150 : o === -100 },
  { label: "Underdog (+150 to +299)", test: (o: number) => o >= 150 && o < 300 },
  { label: "Long shot (+300 or longer)", test: (o: number) => o >= 300 },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BET_TYPE_LABELS: Record<string, string> = {
  moneyline: "Moneyline",
  spread: "Spread",
  total: "Total (O/U)",
  prop: "Prop",
  parlay: "Parlay",
  futures: "Futures",
  other: "Other",
};

/**
 * The team a single bet was on: the full team name the pick starts with, e.g.
 * "New York Jets +3.5" or "New York Jets vs Buffalo Bills" -> New York Jets.
 * The longest match wins, so "Miami (OH) RedHawks" isn't mistaken for "Miami".
 */
export function pickedTeam(bet: BetWithLegs): string | null {
  if (bet.legs.length > 0) return null;
  const teams = TEAMS_BY_SPORT[bet.sport];
  if (!teams) return null;
  const d = bet.description.trim().toLowerCase();
  let best: string | null = null;
  for (const t of teams) {
    const tl = t.toLowerCase();
    if ((d === tl || d.startsWith(tl + " ")) && (!best || t.length > best.length)) best = t;
  }
  return best;
}

/** The group(s) a bet belongs to for a dimension. Most dimensions give one key; none means "skip". */
export function keysFor(bet: BetWithLegs, dim: Dimension): string[] {
  switch (dim) {
    case "sport":
      return [bet.sport];
    case "betType":
      return [BET_TYPE_LABELS[bet.betType] ?? bet.betType];
    case "sportsbook":
      return [bet.sportsbook ?? "Other"];
    case "team": {
      const t = pickedTeam(bet);
      return t ? [t] : [];
    }
    case "odds": {
      const b = ODDS_BUCKETS.find((x) => x.test(bet.odds));
      return b ? [b.label] : [];
    }
    case "weekday":
      return [WEEKDAYS[parseISO(bet.date).getDay()]];
    case "legs":
      if (bet.legs.length < 2) return [];
      return [bet.legs.length >= 5 ? "5+ legs" : `${bet.legs.length} legs`];
    case "boost":
      return [bet.boostPct ? "With a boost" : "No boost"];
  }
}

export interface GroupRow extends Summary {
  key: string;
}

export function breakdown(bets: BetWithLegs[], dim: Dimension): GroupRow[] {
  const groups = new Map<string, BetWithLegs[]>();
  for (const b of bets) {
    for (const k of keysFor(b, dim)) {
      const list = groups.get(k);
      if (list) list.push(b);
      else groups.set(k, [b]);
    }
  }
  const rows = Array.from(groups, ([key, list]) => ({ key, ...summarize(list) }));
  // Natural order where one exists, otherwise most profitable first
  if (dim === "odds") return rows.sort((a, b) => ODDS_BUCKETS.findIndex((x) => x.label === a.key) - ODDS_BUCKETS.findIndex((x) => x.label === b.key));
  if (dim === "weekday") return rows.sort((a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key));
  if (dim === "legs") return rows.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  return rows.sort((a, b) => b.profit - a.profit || b.settled - a.settled);
}

// ---------- Over time ----------

function settledInOrder(bets: BetWithLegs[]): BetWithLegs[] {
  return bets
    .filter((b) => b.result !== "pending")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

export interface DayPoint {
  date: string;
  profit: number;
  cumulative: number;
  bets: number;
}

/** One point per day that had settled bets, with running profit. */
export function cumulativeByDay(bets: BetWithLegs[]): DayPoint[] {
  const days = new Map<string, { profit: number; bets: number }>();
  for (const b of settledInOrder(bets)) {
    const d = days.get(b.date) ?? { profit: 0, bets: 0 };
    d.profit += b.profit ?? 0;
    d.bets += 1;
    days.set(b.date, d);
  }
  let running = 0;
  return Array.from(days, ([date, d]) => {
    running += d.profit;
    return { date, profit: r2(d.profit), cumulative: r2(running), bets: d.bets };
  });
}

export type Bucket = "day" | "week" | "month";

export interface PeriodPoint {
  key: string; // start date of the bucket
  label: string;
  profit: number;
  bets: number;
  wins: number;
  losses: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Picks a readable bucket size for the span of dates covered. */
export function bucketFor(bets: BetWithLegs[], range: DateRange): Bucket {
  const dates = bets.map((b) => b.date).sort();
  const from = range.from ?? dates[0];
  const to = range.to ?? dates[dates.length - 1];
  if (!from || !to) return "day";
  const span = daysBetween(from, to);
  return span <= 31 ? "day" : span <= 120 ? "week" : "month";
}

function bucketKey(date: string, bucket: Bucket): string {
  if (bucket === "day") return date;
  if (bucket === "month") return date.slice(0, 7) + "-01";
  const d = parseISO(date);
  const mondayOffset = (d.getDay() + 6) % 7; // weeks start on Monday
  return addDays(date, -mondayOffset);
}

export function profitByPeriod(bets: BetWithLegs[], bucket: Bucket): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>();
  for (const b of settledInOrder(bets)) {
    const key = bucketKey(b.date, bucket);
    const label =
      bucket === "month"
        ? `${MONTHS[parseISO(key).getMonth()]} ${String(parseISO(key).getFullYear()).slice(2)}`
        : bucket === "week"
          ? `Wk of ${shortDate(key)}`
          : shortDate(key);
    const p = map.get(key) ?? { key, label, profit: 0, bets: 0, wins: 0, losses: 0 };
    p.profit = r2(p.profit + (b.profit ?? 0));
    p.bets += 1;
    if (b.result === "won") p.wins += 1;
    if (b.result === "lost") p.losses += 1;
    map.set(key, p);
  }
  return Array.from(map.values());
}

export interface Streaks {
  current: { type: "W" | "L"; count: number } | null;
  longestWin: number;
  longestLoss: number;
  bestDay: DayPoint | null;
  worstDay: DayPoint | null;
}

/** Win/loss streaks in the order bets were placed. Pushes don't break or extend a streak. */
export function streaks(bets: BetWithLegs[]): Streaks {
  let longestWin = 0;
  let longestLoss = 0;
  let run: { type: "W" | "L"; count: number } | null = null;
  for (const b of settledInOrder(bets)) {
    if (b.result === "push") continue;
    const type = b.result === "won" ? "W" : "L";
    run = run && run.type === type ? { type, count: run.count + 1 } : { type, count: 1 };
    if (type === "W") longestWin = Math.max(longestWin, run.count);
    else longestLoss = Math.max(longestLoss, run.count);
  }
  const days = cumulativeByDay(bets);
  const best = days.reduce<DayPoint | null>((m, d) => (!m || d.profit > m.profit ? d : m), null);
  const worst = days.reduce<DayPoint | null>((m, d) => (!m || d.profit < m.profit ? d : m), null);
  return {
    current: run,
    longestWin,
    longestLoss,
    bestDay: best && best.profit > 0 ? best : null,
    worstDay: worst && worst.profit < 0 ? worst : null,
  };
}

// ---------- Leak finder ----------

export interface Insight {
  dimension: string;
  key: string;
  profit: number;
  roi: number;
  settled: number;
  wins: number;
  losses: number;
}

export const MIN_BETS_FOR_INSIGHT = 5;

/**
 * Where the money is going: groups with enough settled bets whose ROI is clearly
 * negative (leaks) or clearly positive (strengths), biggest dollar impact first.
 */
export function insights(bets: BetWithLegs[], minBets = MIN_BETS_FOR_INSIGHT): { leaks: Insight[]; strengths: Insight[] } {
  const all: Insight[] = [];
  const dims: Dimension[] = ["sport", "betType", "sportsbook", "team", "odds", "weekday", "legs"];
  for (const dim of dims) {
    const label = DIMENSIONS.find((d) => d.value === dim)!.label;
    for (const row of breakdown(bets, dim)) {
      if (row.settled < minBets || row.roi === null) continue;
      all.push({ dimension: label, key: row.key, profit: row.profit, roi: row.roi, settled: row.settled, wins: row.wins, losses: row.losses });
    }
  }
  const leaks = all.filter((i) => i.profit < 0 && i.roi <= -10).sort((a, b) => a.profit - b.profit).slice(0, 3);
  const strengths = all.filter((i) => i.profit > 0 && i.roi >= 10).sort((a, b) => b.profit - a.profit).slice(0, 3);
  return { leaks, strengths };
}
