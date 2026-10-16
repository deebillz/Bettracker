import { test } from "node:test";
import assert from "node:assert/strict";
import { calcWin, parlayOdds, parseAmericanOdds, settleAmounts } from "../shared/odds";

test("parses American odds", () => {
  assert.equal(parseAmericanOdds("+230"), 230);
  assert.equal(parseAmericanOdds("-142"), -142);
  assert.equal(parseAmericanOdds(" 150 "), 150);
  assert.equal(parseAmericanOdds("50"), null); // between -100 and +100 isn't valid
  assert.equal(parseAmericanOdds("abc"), null);
  assert.equal(parseAmericanOdds("1.5"), null);
});

test("no boost: plain payout", () => {
  const w = calcWin({ stake: 100, odds: -110 });
  assert.equal(w.toWin, 90.91);
  assert.equal(w.payout, 190.91);
  assert.equal(w.boostedOdds, -110);
});

test("25% profit boost on +200 adds 25% to the winnings, not the stake", () => {
  const w = calcWin({ stake: 100, odds: 200, boostPct: 25 });
  assert.equal(w.baseWin, 200);
  assert.equal(w.bonusWin, 50);
  assert.equal(w.toWin, 250);
  assert.equal(w.payout, 350);
  assert.equal(w.boostedOdds, 250);
});

test("boost on a favorite: -150 with 50% boost becomes +100", () => {
  const w = calcWin({ stake: 150, odds: -150, boostPct: 50 });
  assert.equal(w.toWin, 150);
  assert.equal(w.boostedOdds, 100);
});

test("max extra winnings caps the bonus", () => {
  const w = calcWin({ stake: 50, odds: 400, boostPct: 100, boostMaxWin: 25 });
  assert.equal(w.baseWin, 200);
  assert.equal(w.bonusWin, 25);
  assert.equal(w.toWin, 225);
});

test("parlay odds from legs", () => {
  assert.equal(parlayOdds([-110, -110]), 264);
  assert.equal(parlayOdds([-110, 150]), 377);
  assert.equal(parlayOdds([150]), null);
});

test("boosted parlay settles with the boost", () => {
  const odds = parlayOdds([-110, -110, -110])!; // +596
  assert.equal(odds, 596);
  const r = settleAmounts({ stake: 10, odds, boostPct: 25 }, "won");
  assert.equal(r.profit, 74.5);
  assert.equal(r.payout, 84.5);
});

test("settle: lost, push and custom payout", () => {
  const bet = { stake: 20, odds: 150, boostPct: 20 };
  assert.deepEqual(settleAmounts(bet, "lost"), { payout: 0, profit: -20 });
  assert.deepEqual(settleAmounts(bet, "push"), { payout: 20, profit: 0 });
  assert.deepEqual(settleAmounts(bet, "won", 35), { payout: 35, profit: 15 });
  assert.deepEqual(settleAmounts(bet, "pending"), { payout: null, profit: null });
});
