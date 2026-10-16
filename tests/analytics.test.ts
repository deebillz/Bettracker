import { test } from "node:test";
import assert from "node:assert/strict";
import type { BetWithLegs } from "../shared/schema";
import {
  applyFilters,
  breakdown,
  bucketFor,
  cumulativeByDay,
  insights,
  pickedTeam,
  previousRange,
  profitByPeriod,
  rangeFor,
  streaks,
  summarize,
} from "../client/src/lib/analytics";

let nextId = 1;
function bet(p: Partial<BetWithLegs> & { result?: string; profit?: number | null }): BetWithLegs {
  const stake = p.stake ?? 10;
  return {
    id: nextId++,
    userId: 1,
    date: "2026-10-10",
    sport: "NFL",
    betType: "moneyline",
    description: "New York Jets vs Buffalo Bills",
    odds: -110,
    stake,
    boostPct: null,
    boostMaxWin: null,
    result: "pending",
    payout: null,
    profit: null,
    sportsbook: "DraftKings",
    notes: null,
    createdAt: new Date(),
    settledAt: null,
    legs: [],
    ...p,
  } as BetWithLegs;
}

const won = (p: Partial<BetWithLegs> = {}) => bet({ result: "won", profit: 9.09, ...p });
const lost = (p: Partial<BetWithLegs> = {}) => bet({ result: "lost", profit: -(p.stake ?? 10), ...p });

test("summary: win rate ignores pushes, ROI uses settled stakes only", () => {
  const s = summarize([won(), lost(), bet({ result: "push", profit: 0 }), bet({ stake: 50 })]);
  assert.equal(s.bets, 4);
  assert.equal(s.settled, 3);
  assert.equal(s.pending, 1);
  assert.equal(s.winRate, 50);
  assert.equal(s.staked, 30);
  assert.equal(s.profit, -0.91);
  assert.equal(Math.round(s.roi! * 100) / 100, -3.03);
});

test("summary: boost profit counts only the extra winnings on winning boosted bets", () => {
  const s = summarize([
    won({ odds: 200, stake: 100, boostPct: 25, profit: 250 }), // +50 from the boost
    lost({ odds: 200, stake: 100, boostPct: 25 }), // lost: boost added nothing
  ]);
  assert.equal(s.boosted, 2);
  assert.equal(s.boostProfit, 50);
});

test("date ranges and the matching previous period", () => {
  const today = new Date(2026, 9, 16, 12); // Oct 16, 2026
  assert.deepEqual(rangeFor("7d", today), { from: "2026-10-10", to: "2026-10-16" });
  assert.deepEqual(rangeFor("month", today), { from: "2026-10-01", to: "2026-10-16" });
  assert.deepEqual(rangeFor("lastMonth", today), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(previousRange("month", rangeFor("month", today)), { from: "2026-09-01", to: "2026-09-16" });
  assert.deepEqual(previousRange("lastMonth", rangeFor("lastMonth", today)), { from: "2026-08-01", to: "2026-08-30" });
  assert.deepEqual(previousRange("7d", rangeFor("7d", today)), { from: "2026-10-03", to: "2026-10-09" });
  assert.deepEqual(previousRange("year", rangeFor("year", today)), { from: "2025-01-01", to: "2025-10-16" });
  assert.equal(previousRange("all", rangeFor("all", today)), null);
  // March 31 -> February has no 31st, so it stops at the 28th
  assert.deepEqual(previousRange("month", { from: "2026-03-01", to: "2026-03-31" }), { from: "2026-02-01", to: "2026-02-28" });
});

test("filters combine", () => {
  const bets = [
    won({ sport: "NBA", sportsbook: "FanDuel", date: "2026-10-01" }),
    won({ sport: "NBA", sportsbook: "DraftKings", date: "2026-10-02", boostPct: 20 }),
    lost({ sport: "NFL", date: "2026-10-02" }),
    lost({ sport: "NBA", date: "2026-09-02" }),
  ];
  const f = { range: { from: "2026-10-01", to: "2026-10-31" }, sport: "NBA", betType: "all", sportsbook: "all", boost: "all" as const };
  assert.equal(applyFilters(bets, f).length, 2);
  assert.equal(applyFilters(bets, { ...f, sportsbook: "FanDuel" }).length, 1);
  assert.equal(applyFilters(bets, { ...f, boost: "boosted" }).length, 1);
  assert.equal(applyFilters(bets, { ...f, boost: "regular" }).length, 1);
});

test("team pick comes from the first team in the description", () => {
  assert.equal(pickedTeam(bet({})), "New York Jets");
  assert.equal(pickedTeam(bet({ description: "Jets +3.5" })), null); // not a full team name
  assert.equal(pickedTeam(bet({ sport: "College Football", description: "Sacramento State Hornets vs North Dakota State Bison" })), "Sacramento State Hornets");
});

test("breakdowns: odds buckets, weekdays and parlay legs", () => {
  const leg = { id: 1, betId: 1, position: 0, sport: "NFL", pick: "x", odds: -110, result: "pending" };
  const bets = [
    won({ odds: -250 }),
    lost({ odds: -120 }),
    won({ odds: 120 }),
    lost({ odds: 500, date: "2026-10-11" }), // Sunday
    won({ betType: "parlay", odds: 264, legs: [leg, leg] }),
    lost({ betType: "parlay", odds: 596, legs: [leg, leg, leg] }),
  ];
  assert.deepEqual(
    breakdown(bets, "odds").map((r) => [r.key, r.settled]),
    [
      ["Big favorite (-200 or shorter)", 1],
      ["Favorite (-199 to -101)", 1],
      ["Near even (-100 to +149)", 1],
      ["Underdog (+150 to +299)", 1],
      ["Long shot (+300 or longer)", 2],
    ],
  );
  assert.deepEqual(breakdown(bets, "weekday").map((r) => r.key), ["Sunday", "Saturday"]);
  assert.deepEqual(breakdown(bets, "legs").map((r) => [r.key, r.wins]), [["2 legs", 1], ["3 legs", 0]]);
});

test("streaks skip pushes; best and worst days", () => {
  const s = streaks([
    won({ date: "2026-10-01" }),
    won({ date: "2026-10-01" }),
    bet({ date: "2026-10-02", result: "push", profit: 0 }),
    won({ date: "2026-10-02" }),
    lost({ date: "2026-10-03", stake: 50 }),
    lost({ date: "2026-10-04" }),
  ]);
  assert.equal(s.longestWin, 3);
  assert.equal(s.longestLoss, 2);
  assert.deepEqual(s.current, { type: "L", count: 2 });
  assert.equal(s.bestDay?.date, "2026-10-01");
  assert.equal(s.worstDay?.date, "2026-10-03");
});

test("cumulative and per-period profit", () => {
  const bets = [won({ date: "2026-10-01" }), lost({ date: "2026-10-01" }), won({ date: "2026-10-20" })];
  assert.deepEqual(cumulativeByDay(bets).map((d) => d.cumulative), [-0.91, 8.18]);
  assert.equal(bucketFor(bets, { from: null, to: null }), "day");
  assert.equal(bucketFor(bets, { from: "2026-01-01", to: "2026-10-31" }), "month");
  const weeks = profitByPeriod(bets, "week");
  assert.deepEqual(weeks.map((w) => w.key), ["2026-09-28", "2026-10-19"]); // Mondays
});

test("leak finder needs enough bets and a clear edge either way", () => {
  const nbaProps = Array.from({ length: 6 }, () => lost({ sport: "NBA", betType: "prop" }));
  const nflWins = Array.from({ length: 5 }, () => won({ sport: "NFL" }));
  const few = [lost({ sport: "MLB" }), lost({ sport: "MLB" })];
  const { leaks, strengths } = insights([...nbaProps, ...nflWins, ...few]);
  assert.ok(leaks.some((l) => l.key === "NBA" && l.profit === -60));
  assert.ok(leaks.every((l) => l.key !== "MLB")); // only 2 bets: not enough to call it
  assert.ok(strengths.some((s) => s.key === "NFL"));
});
