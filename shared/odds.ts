// Odds and payout math shared by the server and the browser, so the preview
// in the bet form always matches what gets saved when a bet is settled.

/** Parse "+230", "230" or "-142" into an integer. Returns null for anything that isn't valid American odds. */
export function parseAmericanOdds(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const n = typeof input === "number" ? input : Number(String(input).trim().replace(/^\+/, ""));
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  // Valid American odds are <= -100 or >= +100
  if (n > -100 && n < 100) return null;
  return n;
}

export function formatAmericanOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/** Decimal odds, e.g. +150 -> 2.5, -200 -> 1.5 */
export function americanToDecimal(odds: number): number {
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
}

/** Nearest American odds for a decimal price. */
export function decimalToAmerican(dec: number): number {
  if (dec <= 1) return -100000;
  // Tiny tolerance so float noise (1.9999999) still reads as even money, +100
  if (dec >= 2 - 1e-9) return Math.round((dec - 1) * 100);
  const american = -Math.round(100 / (dec - 1));
  return american === -100 ? 100 : american;
}

/** Combined price of a parlay from its legs' American odds. */
export function parlayOdds(legOdds: number[]): number | null {
  if (legOdds.length < 2) return null;
  const dec = legOdds.reduce((acc, o) => acc * americanToDecimal(o), 1);
  return decimalToAmerican(dec);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BoostInput {
  stake: number;
  odds: number; // American, before the boost
  boostPct?: number | null; // e.g. 25 for a 25% profit boost
  boostMaxWin?: number | null; // optional cap on the extra winnings, in dollars
}

export interface WinBreakdown {
  baseWin: number; // winnings without the boost
  bonusWin: number; // extra winnings the boost adds (after any cap)
  toWin: number; // baseWin + bonusWin
  payout: number; // stake + toWin
  boostedOdds: number; // the effective American price after the boost
}

/**
 * Sportsbook-style profit boost: the boost % is applied to the winnings, not
 * the stake. Example: $100 at +200 with a 25% boost wins $200 + $50 = $250,
 * which works out to boosted odds of +250.
 */
export function calcWin({ stake, odds, boostPct, boostMaxWin }: BoostInput): WinBreakdown {
  const baseWin = stake * (americanToDecimal(odds) - 1);
  let bonusWin = boostPct && boostPct > 0 ? baseWin * (boostPct / 100) : 0;
  if (boostMaxWin != null && boostMaxWin >= 0) bonusWin = Math.min(bonusWin, boostMaxWin);
  const toWin = baseWin + bonusWin;
  const boostedOdds = stake > 0 ? decimalToAmerican(1 + toWin / stake) : odds;
  return {
    baseWin: roundMoney(baseWin),
    bonusWin: roundMoney(bonusWin),
    toWin: roundMoney(toWin),
    payout: roundMoney(stake + toWin),
    boostedOdds,
  };
}

export type BetResult = "pending" | "won" | "lost" | "push";

/** Payout and profit for a settled bet. A custom payout (cash-outs, reduced parlays) overrides the math. */
export function settleAmounts(
  bet: BoostInput,
  result: BetResult,
  customPayout?: number | null,
): { payout: number | null; profit: number | null } {
  if (result === "pending") return { payout: null, profit: null };
  let payout: number;
  if (customPayout != null) payout = customPayout;
  else if (result === "won") payout = calcWin(bet).payout;
  else if (result === "push") payout = bet.stake;
  else payout = 0;
  payout = roundMoney(payout);
  return { payout, profit: roundMoney(payout - bet.stake) };
}
