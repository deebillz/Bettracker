import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Zap, ChevronDown, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORTS, SPORTSBOOKS, BOOST_PRESETS } from "@/lib/constants";
import { parseAmericanOdds, formatAmericanOdds, parlayOdds, calcWin } from "@shared/odds";
import OddsInput from "@/components/odds-input";
import PickInput from "@/components/pick-input";
import { loadFormDefaults, rememberFormChoices } from "@/lib/form-defaults";
import type { BetPrefill } from "@/lib/bet-form-store";

// Short labels for the one-tap chips (values match what's stored)
const TYPE_CHIPS = [
  { value: "moneyline", label: "Moneyline" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Total" },
  { value: "prop", label: "Prop" },
  { value: "parlay", label: "Parlay" },
  { value: "futures", label: "Futures" },
  { value: "other", label: "Other" },
];
const SPORT_SHORT: Record<string, string> = { "College Football": "NCAAF", "College Basketball": "NCAAB" };
const MAIN_SPORTS = ["NFL", "NBA", "MLB", "NHL", "College Football", "College Basketball"];
const MAIN_BOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "Fanatics"];

const PICK_HINTS: Record<string, string> = {
  moneyline: "Team or player, e.g. New York Jets",
  spread: "e.g. New York Jets +3.5",
  total: "e.g. Jets vs Bills Over 44.5",
  prop: "e.g. Jalen Brunson 25+ points",
  futures: "e.g. Knicks to win the title",
  other: "What you bet on",
};

interface Leg {
  sport: string;
  pick: string;
  odds: string;
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Small building blocks ----------

function Chips({
  options,
  value,
  onChange,
  testId,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  testId: string;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          data-testid={`${testId}-${o.value.toLowerCase().replace(/\s+/g, "-")}`}
          className={cn(
            "h-8 rounded-full border px-3 text-sm font-medium transition-colors",
            value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "More" dropdown for the options that don't get their own chip. */
function MoreSelect({ options, value, onChange, testId }: { options: string[]; value: string; onChange: (v: string) => void; testId: string }) {
  const isOther = options.includes(value);
  return (
    <Select value={isOther ? value : ""} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto gap-1 rounded-full px-3 text-sm font-medium",
          isOther ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
        data-testid={testId}
      >
        <SelectValue placeholder="More" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      {children}
      {hint && !error && <div className="text-xs text-muted-foreground">{hint}</div>}
      {error && <div className="text-xs font-medium text-destructive">{error}</div>}
    </div>
  );
}

function PayoutPreview({ odds, stake, boostPct, boostMaxWin }: { odds: number | null; stake: number; boostPct: number | null; boostMaxWin: number | null }) {
  if (odds === null || !(stake > 0)) return null;
  const w = calcWin({ stake, odds, boostPct, boostMaxWin });
  const boosted = w.bonusWin > 0;
  const capped = boosted && boostMaxWin != null && w.bonusWin >= boostMaxWin;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm",
        boosted ? "border-amber-500/40 bg-amber-500/10" : "border-primary/20 bg-primary/5",
      )}
      data-testid="payout-preview"
    >
      <div className="tabular-nums">
        {boosted ? (
          <>
            <span className="text-muted-foreground line-through mr-1.5">{formatAmericanOdds(odds)}</span>
            <span className="font-bold text-amber-600 dark:text-amber-400" data-testid="text-boosted-odds">
              {formatAmericanOdds(w.boostedOdds)}
            </span>
          </>
        ) : (
          <span className="font-semibold">{formatAmericanOdds(odds)}</span>
        )}
        {boosted && (
          <div className="text-xs text-muted-foreground">
            +{money(w.bonusWin)} boost{capped ? " (capped)" : ""}
          </div>
        )}
      </div>
      <div className="text-right tabular-nums">
        <div>
          To win <span className="font-semibold" data-testid="text-to-win">{money(w.toWin)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Payout <span data-testid="text-payout">{money(w.payout)}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- The form ----------

export default function BetForm({
  onSubmit,
  isPending,
  prefill,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  prefill?: BetPrefill | null;
}) {
  const defaults = useMemo(loadFormDefaults, []);

  const [betType, setBetType] = useState(prefill?.betType ?? defaults.betType);
  const [sport, setSport] = useState(prefill && prefill.betType !== "parlay" ? prefill.sport : defaults.sport);
  const [pick, setPick] = useState(prefill?.betType !== "parlay" ? (prefill?.description ?? "") : "");
  const [odds, setOdds] = useState(prefill?.betType !== "parlay" ? (prefill?.odds ?? "") : "");
  const [stake, setStake] = useState(prefill?.stake ?? defaults.stake);
  const [book, setBook] = useState(prefill?.sportsbook ?? defaults.sportsbook);
  const [boostOn, setBoostOn] = useState(!!prefill?.boostPct);
  const [boostPct, setBoostPct] = useState(prefill?.boostPct ? String(prefill.boostPct) : "");
  const [boostMaxWin, setBoostMaxWin] = useState(prefill?.boostMaxWin != null ? String(prefill.boostMaxWin) : "");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [legs, setLegs] = useState<Leg[]>(
    prefill?.legs.length ? prefill.legs : [{ sport: defaults.sport, pick: "", odds: "" }, { sport: defaults.sport, pick: "", odds: "" }],
  );
  const [parlayPrice, setParlayPrice] = useState(prefill?.betType === "parlay" ? prefill.odds : "");
  const [priceEdited, setPriceEdited] = useState(prefill?.betType === "parlay");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isParlay = betType === "parlay";
  const isToday = date === todayISO();

  // Chip lists: what you use most first, then the common ones
  const sportChips = Array.from(new Set([...defaults.recentSports.filter((s) => SPORTS.includes(s)), ...MAIN_SPORTS])).slice(0, 6);
  if (!sportChips.includes(sport) && sport) sportChips.push(sport);
  const bookChips = Array.from(new Set([...defaults.recentBooks.filter((b) => SPORTSBOOKS.includes(b)), ...MAIN_BOOKS])).slice(0, 5);
  if (!bookChips.includes(book) && book) bookChips.push(book);
  const stakeChips = Array.from(new Set([...defaults.recentStakes, "10", "25", "50", "100"])).filter((s) => Number(s) > 0).slice(0, 4);

  // Parlay price: from the legs unless you typed the book's exact price
  const legOdds = legs.map((l) => parseAmericanOdds(l.odds)).filter((o): o is number => o !== null);
  const combined = parlayOdds(legOdds);
  const parlayValue = priceEdited ? parlayPrice : combined !== null ? formatAmericanOdds(combined) : "";

  const oddsNum = parseAmericanOdds(isParlay ? parlayValue : odds);
  const stakeNum = Number(stake);
  const boostNum = boostOn && Number(boostPct) > 0 ? Number(boostPct) : null;
  const capNum = boostOn && boostMaxWin !== "" ? Number(boostMaxWin) : null;

  const updateLeg = (i: number, patch: Partial<Leg>) => setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    let payloadLegs: { sport: string; pick: string; odds: number }[] | undefined;
    let description = pick.trim();
    let betSport = sport;

    if (isParlay) {
      const filled = legs.filter((l) => l.pick.trim() || l.odds);
      if (filled.length < 2) errs.legs = "A parlay needs at least 2 legs";
      else if (filled.some((l) => !l.pick.trim() || parseAmericanOdds(l.odds) === null))
        errs.legs = "Each leg needs a pick and odds";
      else {
        payloadLegs = filled.map((l) => ({ sport: l.sport, pick: l.pick.trim(), odds: parseAmericanOdds(l.odds)! }));
        const sports = Array.from(new Set(payloadLegs.map((l) => l.sport)));
        betSport = sports.length === 1 ? sports[0] : "Mixed";
        description = payloadLegs.map((l) => l.pick).join(" + ");
      }
    } else if (!description) errs.pick = "What did you bet on?";

    if (oddsNum === null) errs.odds = isParlay ? "Add odds to the legs, or type the parlay price" : "Enter the odds, like 110 with − or +";
    if (!(stakeNum > 0)) errs.stake = "Enter how much you bet";
    if (boostOn && !(Number(boostPct) > 0 && Number(boostPct) <= 1000)) errs.boost = "Pick a boost %";
    if (capNum !== null && !(capNum >= 0)) errs.boost = "Max extra winnings must be 0 or more";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    rememberFormChoices({ betType, sport, sportsbook: book || null, stake });
    onSubmit({
      date,
      sport: betSport,
      betType,
      description,
      odds: oddsNum,
      stake: stakeNum,
      sportsbook: book || null,
      notes: notes.trim() || null,
      boostPct: boostNum,
      boostMaxWin: boostNum ? capNum : null,
      legs: payloadLegs,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Chips label="Bet type" options={TYPE_CHIPS} value={betType} onChange={(v) => { setBetType(v); setErrors({}); }} testId="type" />

      {!isParlay ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chips
              label="Sport"
              options={sportChips.map((s) => ({ value: s, label: SPORT_SHORT[s] ?? s }))}
              value={sport}
              onChange={setSport}
              testId="sport"
            />
            <MoreSelect options={SPORTS.filter((s) => !sportChips.includes(s))} value={sport} onChange={setSport} testId="sport-more" />
          </div>

          <Field label="Your pick" error={errors.pick}>
            <PickInput sport={sport} value={pick} onChange={setPick} onSportChange={setSport} placeholder={PICK_HINTS[betType] ?? PICK_HINTS.other} testId="input-pick" invalid={!!errors.pick} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Odds" error={errors.odds}>
              <OddsInput value={odds} onChange={setOdds} testId="input-odds" invalid={!!errors.odds} />
            </Field>
            <Field label="Stake ($)" error={errors.stake}>
              <Input
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="25"
                className={cn("h-9 text-sm", errors.stake && "border-destructive")}
                data-testid="input-stake"
              />
            </Field>
          </div>
        </>
      ) : (
        <div className="space-y-2.5">
          {legs.map((leg, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-2" data-testid={`parlay-leg-${i}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leg {i + 1}</span>
                <Select value={leg.sport} onValueChange={(v) => updateLeg(i, { sport: v })}>
                  <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs" data-testid={`leg-sport-${i}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {legs.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))}
                    aria-label={`Remove leg ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <PickInput sport={leg.sport} value={leg.pick} onChange={(v) => updateLeg(i, { pick: v })} onSportChange={(v) => updateLeg(i, { sport: v })} placeholder="Pick, e.g. Jets ML" testId={`leg-pick-${i}`} />
                <OddsInput value={leg.odds} onChange={(v) => updateLeg(i, { odds: v })} testId={`leg-odds-${i}`} aria-label={`Leg ${i + 1} odds`} />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setLegs((ls) => [...ls, { sport: ls[ls.length - 1]?.sport ?? defaults.sport, pick: "", odds: "" }])}
            data-testid="button-add-leg"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add leg
          </Button>
          {errors.legs && <div className="text-xs font-medium text-destructive">{errors.legs}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Parlay odds"
              error={errors.odds}
              hint={priceEdited && combined !== null ? `From legs: ${formatAmericanOdds(combined)}` : "Fills in from the legs"}
            >
              <OddsInput
                value={parlayValue}
                onChange={(v) => {
                  setParlayPrice(v);
                  setPriceEdited(v !== "");
                }}
                testId="input-parlay-odds"
                invalid={!!errors.odds}
              />
            </Field>
            <Field label="Stake ($)" error={errors.stake}>
              <Input
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="10"
                className={cn("h-9 text-sm", errors.stake && "border-destructive")}
                data-testid="input-stake"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Quick stakes */}
      <div className="flex flex-wrap gap-1.5" aria-label="Quick stake">
        {stakeChips.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStake(s)}
            className={cn(
              "h-7 rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors",
              Number(stake) === Number(s) ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
            data-testid={`stake-chip-${s}`}
          >
            ${s}
          </button>
        ))}
      </div>

      {/* Sportsbook: remembered, one tap to change */}
      <div className="space-y-1.5">
        <div className="text-sm font-medium">Sportsbook</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chips label="Sportsbook" options={bookChips.map((b) => ({ value: b, label: b }))} value={book} onChange={setBook} testId="book" />
          <MoreSelect options={SPORTSBOOKS.filter((b) => !bookChips.includes(b))} value={book} onChange={setBook} testId="book-more" />
        </div>
      </div>

      {/* Odds boost: off unless you have a promo */}
      <div className="rounded-lg border border-border/60 px-3 py-2.5 space-y-2.5">
        <label className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Odds boost
          </span>
          <Switch checked={boostOn} onCheckedChange={setBoostOn} data-testid="switch-boost" />
        </label>
        {boostOn && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {BOOST_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBoostPct(String(p))}
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                    Number(boostPct) === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  data-testid={`boost-preset-${p}`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                inputMode="decimal"
                value={boostPct}
                onChange={(e) => setBoostPct(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Boost %"
                aria-label="Boost percent"
                className="h-9 text-sm"
                data-testid="input-boost-pct"
              />
              <Input
                inputMode="decimal"
                value={boostMaxWin}
                onChange={(e) => setBoostMaxWin(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Max extra $ (optional)"
                aria-label="Max extra winnings"
                className="h-9 text-sm"
                data-testid="input-boost-max"
              />
            </div>
            {errors.boost && <div className="text-xs font-medium text-destructive">{errors.boost}</div>}
          </>
        )}
      </div>

      <PayoutPreview odds={oddsNum} stake={stakeNum} boostPct={boostNum} boostMaxWin={capNum} />

      {/* Date and notes are rarely changed, so they stay folded away */}
      <div>
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
          aria-expanded={showMore}
          data-testid="button-more-options"
        >
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {isToday ? "Today" : date}
            {notes.trim() ? " · has a note" : ""}
          </span>
          <span className="flex items-center gap-1">
            Date & notes
            <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
          </span>
        </button>
        {showMore && (
          <div className="mt-2.5 space-y-2.5">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} className="h-9 text-sm" data-testid="input-date" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-16 resize-none text-sm" data-testid="input-notes" />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-bet">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isParlay ? (
          `Log ${legs.length}-leg parlay`
        ) : (
          "Log bet"
        )}
      </Button>
    </form>
  );
}
