// Remembers the choices you make most, so the next bet starts with them filled in.
// Stored on this device only; if storage is unavailable the form just uses its defaults.

const KEY = "bettracker-form-defaults";

export interface FormDefaults {
  betType: string;
  sport: string;
  sportsbook: string;
  stake: string;
  recentStakes: string[]; // most recent first, for the quick-pick chips
  recentBooks: string[];
  recentSports: string[];
}

const DEFAULTS: FormDefaults = {
  betType: "moneyline",
  sport: "NFL",
  sportsbook: "DraftKings",
  stake: "",
  recentStakes: [],
  recentBooks: [],
  recentSports: [],
};

export function loadFormDefaults(): FormDefaults {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

const bump = (list: string[], v: string, max: number) => (v ? [v, ...list.filter((x) => x !== v)].slice(0, max) : list);

export function rememberFormChoices(c: { betType: string; sport: string; sportsbook: string | null; stake: string }) {
  const d = loadFormDefaults();
  const next: FormDefaults = {
    ...d,
    betType: c.betType,
    sport: c.betType === "parlay" ? d.sport : c.sport,
    sportsbook: c.sportsbook ?? d.sportsbook,
    stake: c.stake,
    recentStakes: bump(d.recentStakes, String(Number(c.stake)), 4),
    recentBooks: bump(d.recentBooks, c.sportsbook ?? "", 4),
    recentSports: c.betType === "parlay" ? d.recentSports : bump(d.recentSports, c.sport, 6),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // not saved; nothing else depends on it
  }
}
