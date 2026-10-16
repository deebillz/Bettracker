import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, ChevronsUpDown, Check, Plus, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAMS_BY_SPORT, INDIVIDUAL_SPORTS } from "@/data/teams";
import { SPORTS, BET_TYPES, SPORTSBOOKS, BOOST_PRESETS } from "@/lib/constants";
import { parseAmericanOdds, formatAmericanOdds, parlayOdds, calcWin } from "@shared/odds";

const optionalPositive = (msg: string) =>
  z
    .string()
    .optional()
    .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0), msg);

const formSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    sport: z.string(),
    betType: z.string().min(1, "Bet type is required"),
    description: z.string(),
    odds: z.string().refine((v) => parseAmericanOdds(v) !== null, "Enter odds like -142 or +230"),
    stake: z
      .string()
      .min(1, "Stake is required")
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Must be more than 0"),
    sportsbook: z.string(),
    notes: z.string().optional(),
    boostOn: z.boolean(),
    boostPct: z.string().optional(),
    boostMaxWin: optionalPositive("Must be 0 or more"),
  })
  .superRefine((v, ctx) => {
    if (v.betType !== "parlay") {
      if (!v.sport) ctx.addIssue({ code: "custom", path: ["sport"], message: "Sport is required" });
      if (!v.description.trim())
        ctx.addIssue({ code: "custom", path: ["description"], message: "Description is required" });
    }
    if (v.boostOn) {
      const pct = Number(v.boostPct);
      if (!v.boostPct || !Number.isFinite(pct) || pct <= 0 || pct > 1000)
        ctx.addIssue({ code: "custom", path: ["boostPct"], message: "Enter a boost between 1 and 1000%" });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface ParlayLeg {
  sport: string;
  teamA: string;
  teamB: string;
  pick: string;
  odds: string;
}

const emptyLeg = (): ParlayLeg => ({ sport: "", teamA: "", teamB: "", pick: "", odds: "" });

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------- TeamCombobox ----------
function TeamCombobox({
  teams,
  value,
  onChange,
  placeholder,
  testId,
}: {
  teams: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 bg-transparent text-sm"
          data-testid={testId}
        >
          <span className="truncate">{value || <span className="text-muted-foreground">{placeholder}</span>}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {teams.map((team) => (
                <CommandItem
                  key={team}
                  value={team}
                  onSelect={() => {
                    onChange(team);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === team ? "opacity-100" : "opacity-0")} />
                  {team}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- One parlay leg ----------
function ParlayLegRow({
  leg,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  leg: ParlayLeg;
  index: number;
  onUpdate: (index: number, leg: ParlayLeg) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const teams = useMemo(() => TEAMS_BY_SPORT[leg.sport] || [], [leg.sport]);
  const hasTeams = teams.length > 0;
  const oddsInvalid = leg.odds.trim() !== "" && parseAmericanOdds(leg.odds) === null;

  const updateField = useCallback(
    (field: keyof ParlayLeg, value: string) => {
      const updated = { ...leg, [field]: value };
      if (field === "sport") {
        updated.teamA = "";
        updated.teamB = "";
        updated.pick = "";
      }
      if (field === "teamA" || field === "teamB") {
        const a = field === "teamA" ? value : leg.teamA;
        const b = field === "teamB" ? value : leg.teamB;
        if (a && b) updated.pick = `${a} vs ${b}`;
        else if (a) updated.pick = a;
      }
      onUpdate(index, updated);
    },
    [leg, index, onUpdate],
  );

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2.5 bg-muted/30" data-testid={`parlay-leg-${index}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leg {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
            aria-label={`Remove leg ${index + 1}`}
            data-testid={`remove-leg-${index}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Select value={leg.sport} onValueChange={(v) => updateField("sport", v)}>
        <SelectTrigger className="h-9 text-sm" data-testid={`leg-sport-${index}`}>
          <SelectValue placeholder="Sport" />
        </SelectTrigger>
        <SelectContent>
          {SPORTS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {leg.sport && hasTeams && (
        <div className="grid grid-cols-2 gap-2">
          <TeamCombobox
            teams={teams}
            value={leg.teamA}
            onChange={(v) => updateField("teamA", v)}
            placeholder="Your pick"
            testId={`leg-team-a-${index}`}
          />
          <TeamCombobox
            teams={teams.filter((t) => t !== leg.teamA)}
            value={leg.teamB}
            onChange={(v) => updateField("teamB", v)}
            placeholder="Opponent"
            testId={`leg-team-b-${index}`}
          />
        </div>
      )}

      <div className="grid grid-cols-[1fr_96px] gap-2">
        <Input
          placeholder="Pick (e.g. Jets +3.5)"
          value={leg.pick}
          onChange={(e) => updateField("pick", e.target.value)}
          className="h-9 text-sm"
          data-testid={`leg-desc-${index}`}
        />
        <Input
          placeholder="Odds"
          inputMode="numeric"
          value={leg.odds}
          onChange={(e) => updateField("odds", e.target.value)}
          className={cn("h-9 text-sm", oddsInvalid && "border-destructive")}
          aria-invalid={oddsInvalid}
          data-testid={`leg-odds-${index}`}
        />
      </div>
    </div>
  );
}

// ---------- Payout preview (shows the boost math live) ----------
function PayoutPreview({
  odds,
  stake,
  boostPct,
  boostMaxWin,
}: {
  odds: number | null;
  stake: number;
  boostPct: number | null;
  boostMaxWin: number | null;
}) {
  if (odds === null || !(stake > 0)) return null;
  const w = calcWin({ stake, odds, boostPct, boostMaxWin });
  const boosted = w.bonusWin > 0;
  const capped = boosted && boostMaxWin != null && w.bonusWin >= boostMaxWin;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm space-y-1",
        boosted ? "border-amber-500/40 bg-amber-500/10" : "border-primary/20 bg-primary/5",
      )}
      data-testid="payout-preview"
    >
      <Row label="Odds">
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
      </Row>
      <Row label="To win">
        <span className="font-semibold" data-testid="text-to-win">
          {money(w.toWin)}
        </span>
        {boosted && (
          <span className="text-xs text-muted-foreground ml-1.5">
            ({money(w.baseWin)} + {money(w.bonusWin)} boost{capped ? ", capped" : ""})
          </span>
        )}
      </Row>
      <Row label="Total payout">
        <span className="font-semibold" data-testid="text-payout">
          {money(w.payout)}
        </span>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular-nums text-right">{children}</span>
    </div>
  );
}

// ---------- Main form ----------
export default function BetForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: today,
      sport: "",
      betType: "",
      description: "",
      odds: "",
      stake: "",
      sportsbook: "DraftKings",
      notes: "",
      boostOn: false,
      boostPct: "",
      boostMaxWin: "",
    },
  });

  const [selectedSport, betType, oddsStr, stakeStr, boostOn, boostPctStr, boostMaxWinStr] = useWatch({
    control: form.control,
    name: ["sport", "betType", "odds", "stake", "boostOn", "boostPct", "boostMaxWin"],
  });
  const isParlay = betType === "parlay";

  const isIndividualSport = INDIVIDUAL_SPORTS.includes(selectedSport);
  const teams = useMemo(() => TEAMS_BY_SPORT[selectedSport] || [], [selectedSport]);
  const hasTeams = teams.length > 0;

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [manualDesc, setManualDesc] = useState(false);

  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([emptyLeg(), emptyLeg()]);
  const [parlayOddsEdited, setParlayOddsEdited] = useState(false);
  const [legsError, setLegsError] = useState("");

  // Single bet: reset team picks when the sport changes
  useEffect(() => {
    if (isParlay) return;
    setTeamA("");
    setTeamB("");
    setManualDesc(false);
    form.setValue("description", "");
  }, [selectedSport, form, isParlay]);

  // Single bet: build the description from the team picks
  useEffect(() => {
    if (isParlay || manualDesc) return;
    if (teamA && teamB) form.setValue("description", `${teamA} vs ${teamB}`);
    else if (teamA) form.setValue("description", teamA);
  }, [teamA, teamB, manualDesc, form, isParlay]);

  // Switching between parlay and single resets the pick fields
  useEffect(() => {
    form.setValue("description", "");
    form.setValue("odds", "");
    setParlayOddsEdited(false);
    setLegsError("");
    if (isParlay) {
      form.setValue("sport", "");
      setParlayLegs([emptyLeg(), emptyLeg()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParlay]);

  // Parlay: combined odds from the legs, unless the user typed the book's exact price
  const legOdds = parlayLegs.map((l) => parseAmericanOdds(l.odds)).filter((o): o is number => o !== null);
  const combinedOdds = parlayOdds(legOdds);
  useEffect(() => {
    if (!isParlay || parlayOddsEdited) return;
    form.setValue("odds", combinedOdds !== null ? formatAmericanOdds(combinedOdds) : "", { shouldValidate: false });
  }, [combinedOdds, isParlay, parlayOddsEdited, form]);

  const updateLeg = useCallback((index: number, leg: ParlayLeg) => {
    setParlayLegs((prev) => prev.map((l, i) => (i === index ? leg : l)));
    setLegsError("");
  }, []);
  const removeLeg = useCallback((index: number) => setParlayLegs((prev) => prev.filter((_, i) => i !== index)), []);
  const addLeg = useCallback(() => setParlayLegs((prev) => [...prev, emptyLeg()]), []);

  const handleSubmit = (values: FormValues) => {
    let sport = values.sport;
    let description = values.description.trim();
    let legs: { sport: string; pick: string; odds: number }[] | undefined;

    if (isParlay) {
      const filled = parlayLegs.filter((l) => l.pick.trim() || l.odds.trim());
      const bad = filled.find((l) => !l.sport || !l.pick.trim() || parseAmericanOdds(l.odds) === null);
      if (bad || filled.length < 2) {
        setLegsError(
          filled.length < 2
            ? "A parlay needs at least 2 legs"
            : "Every leg needs a sport, a pick and valid odds (like -110 or +150)",
        );
        return;
      }
      legs = filled.map((l) => ({ sport: l.sport, pick: l.pick.trim(), odds: parseAmericanOdds(l.odds)! }));
      const sports = Array.from(new Set(legs.map((l) => l.sport)));
      sport = sports.length === 1 ? sports[0] : "Mixed";
      description = description || legs.map((l) => l.pick).join(" + ");
    }

    onSubmit({
      date: values.date,
      sport,
      betType: values.betType,
      description,
      odds: parseAmericanOdds(values.odds),
      stake: Number(values.stake),
      sportsbook: values.sportsbook || null,
      notes: values.notes?.trim() || null,
      boostPct: values.boostOn ? Number(values.boostPct) : null,
      boostMaxWin: values.boostOn && values.boostMaxWin ? Number(values.boostMaxWin) : null,
      legs,
    });
  };

  const previewOdds = parseAmericanOdds(oddsStr);
  const previewStake = Number(stakeStr);
  const previewBoost = boostOn && Number(boostPctStr) > 0 ? Number(boostPctStr) : null;
  const previewCap = boostOn && boostMaxWinStr ? Number(boostMaxWinStr) : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="betType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bet type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-bet-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ===== Parlay ===== */}
        {isParlay && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Parlay legs</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {parlayLegs.length} leg{parlayLegs.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2">
              {parlayLegs.map((leg, i) => (
                <ParlayLegRow
                  key={i}
                  leg={leg}
                  index={i}
                  onUpdate={updateLeg}
                  onRemove={removeLeg}
                  canRemove={parlayLegs.length > 2}
                />
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addLeg} data-testid="button-add-leg">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add leg
            </Button>

            {legsError && (
              <p className="text-sm font-medium text-destructive" data-testid="text-legs-error">
                {legsError}
              </p>
            )}

            <FormField
              control={form.control}
              name="odds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parlay odds</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Fills in from the legs"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setParlayOddsEdited(e.target.value.trim() !== "");
                      }}
                      data-testid="input-parlay-odds"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {parlayOddsEdited && combinedOdds !== null
                      ? `Using your price. Calculated from legs: ${formatAmericanOdds(combinedOdds)}`
                      : "Calculated from the legs. Type over it if your book shows a different price."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ===== Single bet ===== */}
        {!isParlay && (
          <>
            <FormField
              control={form.control}
              name="sport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-sport">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedSport && hasTeams && !manualDesc && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium leading-none">Your pick</span>
                    <TeamCombobox teams={teams} value={teamA} onChange={setTeamA} placeholder="Select team" testId="combo-team-a" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium leading-none">Opponent</span>
                    <TeamCombobox
                      teams={teams.filter((t) => t !== teamA)}
                      value={teamB}
                      onChange={setTeamB}
                      placeholder="Select team"
                      testId="combo-team-b"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  onClick={() => setManualDesc(true)}
                  data-testid="button-manual-desc"
                >
                  Type manually instead
                </button>
              </div>
            )}

            {manualDesc && hasTeams && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => {
                  setManualDesc(false);
                  form.setValue("description", teamA && teamB ? `${teamA} vs ${teamB}` : teamA);
                }}
                data-testid="button-team-picker"
              >
                Use team picker instead
              </button>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isIndividualSport ? "e.g. Canelo ML" : "e.g. Jets +3.5"}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (hasTeams && !manualDesc) setManualDesc(true);
                      }}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="odds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Odds</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. -142 or +230" inputMode="numeric" {...field} data-testid="input-odds" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="sportsbook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sportsbook</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-sportsbook">
                      <SelectValue placeholder="Select book" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SPORTSBOOKS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stake ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="100.00" {...field} data-testid="input-stake" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ===== Odds boost ===== */}
        <div className="rounded-lg border border-border/60 p-3 space-y-3">
          <FormField
            control={form.control}
            name="boostOn"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between space-y-0">
                <div>
                  <FormLabel className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Odds boost
                  </FormLabel>
                  <p className="text-xs text-muted-foreground mt-1">A sportsbook promo that adds a % to your winnings</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-boost" />
                </FormControl>
              </FormItem>
            )}
          />

          {boostOn && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {BOOST_PRESETS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={Number(boostPctStr) === p ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => form.setValue("boostPct", String(p), { shouldValidate: true })}
                    data-testid={`boost-preset-${p}`}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="boostPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Boost (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" min="0" placeholder="25" {...field} data-testid="input-boost-pct" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boostMaxWin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Max extra winnings ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Optional"
                          {...field}
                          data-testid="input-boost-max"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </div>

        <PayoutPreview odds={previewOdds} stake={previewStake} boostPct={previewBoost} boostMaxWin={previewCap} />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any extra context..." className="resize-none h-16" {...field} data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-bet">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isParlay ? (
            `Log ${parlayLegs.length}-leg parlay`
          ) : (
            "Log bet"
          )}
        </Button>
      </form>
    </Form>
  );
}
