export const SPORTS = [
  "NFL",
  "NBA",
  "MLB",
  "NHL",
  "College Football",
  "College Basketball",
  "WNBA",
  "Soccer",
  "Tennis",
  "Golf",
  "Boxing",
  "MMA",
  "Other",
];

/** Label shown in the form -> value stored in the database */
export const BET_TYPES = [
  { label: "Moneyline", value: "moneyline" },
  { label: "Spread", value: "spread" },
  { label: "Total (O/U)", value: "total" },
  { label: "Prop", value: "prop" },
  { label: "Parlay", value: "parlay" },
  { label: "Futures", value: "futures" },
  { label: "Other", value: "other" },
] as const;

export type BetTypeValue = (typeof BET_TYPES)[number]["value"];

export function betTypeLabel(value: string): string {
  return BET_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const SPORTSBOOKS = [
  "DraftKings",
  "FanDuel",
  "BetMGM",
  "Caesars",
  "Fanatics",
  "bet365",
  "Hard Rock Bet",
  "BetRivers",
  "theScore Bet",
  "Fliff",
  "Other",
];

/** Common profit-boost sizes offered as quick picks in the bet form */
export const BOOST_PRESETS = [10, 20, 25, 30, 50, 100];
