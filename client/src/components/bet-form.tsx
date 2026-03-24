import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, ChevronsUpDown, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAMS_BY_SPORT, INDIVIDUAL_SPORTS } from "@/data/teams";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  sport: z.string().min(1, "Sport is required"),
  betType: z.string().min(1, "Bet type is required"),
  description: z.string().min(1, "Description is required"),
  odds: z.string().min(1, "Odds are required"),
  stake: z.string().min(1, "Stake is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  sportsbook: z.string().default("DraftKings"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const SPORTS = ["MLB", "NFL", "NBA", "NHL", "College Football", "College Basketball", "Boxing", "MMA", "Soccer", "Tennis", "Other"];
const BET_TYPES = ["Moneyline", "Parlay", "Spread", "Total (O/U)", "Prop", "Futures", "Other"];
const SPORTSBOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN BET", "Other"];

// ---------- Parlay leg type ----------
interface ParlayLeg {
  sport: string;
  teamA: string;
  teamB: string;
  pick: string; // free-text description of the pick (e.g. "Rangers ML")
  odds: string;
}

function emptyLeg(): ParlayLeg {
  return { sport: "", teamA: "", teamB: "", pick: "", odds: "" };
}

// Convert American odds string to decimal multiplier
function americanToDecimal(odds: string): number | null {
  const n = parseInt(odds, 10);
  if (isNaN(n) || n === 0) return null;
  if (n > 0) return n / 100 + 1;
  return 100 / Math.abs(n) + 1;
}

// Convert decimal multiplier back to American odds string
function decimalToAmerican(dec: number): string {
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
  return `-${Math.round(100 / (dec - 1))}`;
}

// Calculate combined parlay odds from array of American odds strings
function combinedParlayOdds(legs: ParlayLeg[]): string {
  const decimals = legs.map((l) => americanToDecimal(l.odds)).filter((d): d is number => d !== null);
  if (decimals.length < 2) return "";
  const combined = decimals.reduce((acc, d) => acc * d, 1);
  return decimalToAmerican(combined);
}

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
          <span className="truncate">
            {value || <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search...`} />
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
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === team ? "opacity-100" : "opacity-0"
                    )}
                  />
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

// ---------- Single Parlay Leg Row ----------
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
  const isIndividual = INDIVIDUAL_SPORTS.includes(leg.sport);

  const updateField = useCallback(
    (field: keyof ParlayLeg, value: string) => {
      const updated = { ...leg, [field]: value };
      // Reset teams when sport changes
      if (field === "sport") {
        updated.teamA = "";
        updated.teamB = "";
        updated.pick = "";
      }
      // Auto-build pick description from team selections
      if (field === "teamA" || field === "teamB") {
        const a = field === "teamA" ? value : leg.teamA;
        const b = field === "teamB" ? value : leg.teamB;
        if (a && b) updated.pick = `${a} vs ${b}`;
        else if (a) updated.pick = a;
      }
      onUpdate(index, updated);
    },
    [leg, index, onUpdate]
  );

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2.5 bg-muted/30" data-testid={`parlay-leg-${index}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Leg {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
            data-testid={`remove-leg-${index}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Sport selector */}
      <Select value={leg.sport} onValueChange={(v) => updateField("sport", v)}>
        <SelectTrigger className="h-9 text-sm" data-testid={`leg-sport-${index}`}>
          <SelectValue placeholder="Sport" />
        </SelectTrigger>
        <SelectContent>
          {SPORTS.filter((s) => s !== "Other").map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Team pickers or free text */}
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

      {leg.sport && !hasTeams && (
        <Input
          placeholder={isIndividual ? "e.g. Canelo ML" : "Pick description"}
          value={leg.pick}
          onChange={(e) => updateField("pick", e.target.value)}
          className="h-9 text-sm"
          data-testid={`leg-pick-${index}`}
        />
      )}

      {/* Pick override (if teams selected, allow editing) + Odds */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Pick (e.g. Rangers ML)"
          value={leg.pick}
          onChange={(e) => updateField("pick", e.target.value)}
          className="h-9 text-sm"
          data-testid={`leg-desc-${index}`}
        />
        <Input
          placeholder="Odds (e.g. -142)"
          value={leg.odds}
          onChange={(e) => updateField("odds", e.target.value)}
          className="h-9 text-sm"
          data-testid={`leg-odds-${index}`}
        />
      </div>
    </div>
  );
}

// ---------- Main BetForm ----------
export default function BetForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];

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
    },
  });

  const selectedSport = useWatch({ control: form.control, name: "sport" });
  const selectedBetType = useWatch({ control: form.control, name: "betType" });
  const isParlay = selectedBetType === "Parlay";

  const isIndividualSport = INDIVIDUAL_SPORTS.includes(selectedSport);
  const teams = useMemo(() => TEAMS_BY_SPORT[selectedSport] || [], [selectedSport]);
  const hasTeams = teams.length > 0;

  // Single-bet team state
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [manualDesc, setManualDesc] = useState(false);

  // Parlay legs state
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([emptyLeg(), emptyLeg()]);

  // Reset team picks when sport changes (single bet mode)
  useEffect(() => {
    if (isParlay) return;
    setTeamA("");
    setTeamB("");
    setManualDesc(false);
    form.setValue("description", "");
  }, [selectedSport, form, isParlay]);

  // Auto-generate description from team picks (single bet mode)
  useEffect(() => {
    if (isParlay || manualDesc) return;
    if (teamA && teamB) {
      form.setValue("description", `${teamA} vs ${teamB}`);
    } else if (teamA) {
      form.setValue("description", teamA);
    }
  }, [teamA, teamB, manualDesc, form, isParlay]);

  // When switching to/from parlay, reset fields appropriately
  useEffect(() => {
    if (isParlay) {
      form.setValue("sport", "Mixed");
      form.setValue("description", "");
      form.setValue("odds", "");
      setParlayLegs([emptyLeg(), emptyLeg()]);
    } else {
      // If sport was "Mixed" from parlay mode, reset it
      if (form.getValues("sport") === "Mixed") {
        form.setValue("sport", "");
      }
      form.setValue("description", "");
      form.setValue("odds", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParlay]);

  // Sync parlay legs → description + odds
  useEffect(() => {
    if (!isParlay) return;
    const validLegs = parlayLegs.filter((l) => l.pick.trim());
    if (validLegs.length > 0) {
      const desc = validLegs.map((l) => l.pick).join(" + ");
      form.setValue("description", desc);
    }
    const combined = combinedParlayOdds(parlayLegs);
    if (combined) {
      form.setValue("odds", combined);
    }
  }, [parlayLegs, isParlay, form]);

  const updateLeg = useCallback((index: number, leg: ParlayLeg) => {
    setParlayLegs((prev) => {
      const next = [...prev];
      next[index] = leg;
      return next;
    });
  }, []);

  const removeLeg = useCallback((index: number) => {
    setParlayLegs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addLeg = useCallback(() => {
    setParlayLegs((prev) => [...prev, emptyLeg()]);
  }, []);

  const handleSubmit = (values: FormValues) => {
    // Determine sport for parlay: if all legs same sport use that, else "Mixed"
    let sport = values.sport;
    if (isParlay) {
      const legSports = [...new Set(parlayLegs.filter((l) => l.sport).map((l) => l.sport))];
      sport = legSports.length === 1 ? legSports[0] : "Mixed";
    }

    const legsJson = isParlay
      ? JSON.stringify(
          parlayLegs
            .filter((l) => l.pick.trim())
            .map((l) => ({
              sport: l.sport,
              pick: l.pick,
              odds: l.odds,
            }))
        )
      : null;

    onSubmit({
      date: values.date,
      sport,
      betType: values.betType.toLowerCase(),
      description: values.description,
      odds: values.odds,
      stake: parseFloat(values.stake),
      result: "pending",
      sportsbook: values.sportsbook,
      notes: values.notes || null,
      legs: legsJson,
      payout: null,
      profit: null,
    });

    // Reset state
    setTeamA("");
    setTeamB("");
    setManualDesc(false);
    setParlayLegs([emptyLeg(), emptyLeg()]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Row 1: Date + Bet Type */}
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
                <FormLabel>Bet Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-bet-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ========== PARLAY MODE ========== */}
        {isParlay && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Parlay Legs</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {parlayLegs.length} leg{parlayLegs.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addLeg}
              data-testid="button-add-leg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Leg
            </Button>

            {/* Combined odds display */}
            {(() => {
              const combined = combinedParlayOdds(parlayLegs);
              if (!combined) return null;
              return (
                <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Combined Odds</span>
                  <span className="text-sm font-bold text-primary tabular-nums" data-testid="text-combined-odds">
                    {combined}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========== SINGLE BET MODE ========== */}
        {!isParlay && (
          <>
            {/* Sport selector */}
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
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team / Player selection — only shows after sport is selected */}
            {selectedSport && !manualDesc && (
              <div className="space-y-2">
                {hasTeams ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium leading-none">Your Pick</label>
                      <TeamCombobox
                        teams={teams}
                        value={teamA}
                        onChange={setTeamA}
                        placeholder="Select team"
                        testId="combo-team-a"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium leading-none">Opponent</label>
                      <TeamCombobox
                        teams={teams.filter((t) => t !== teamA)}
                        value={teamB}
                        onChange={setTeamB}
                        placeholder="Select team"
                        testId="combo-team-b"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {isIndividualSport
                      ? "Type the matchup or fighter/player names below"
                      : "Type the matchup below"}
                  </div>
                )}
                {hasTeams && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    onClick={() => setManualDesc(true)}
                    data-testid="button-manual-desc"
                  >
                    Type manually instead
                  </button>
                )}
              </div>
            )}

            {manualDesc && hasTeams && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => {
                  setManualDesc(false);
                  form.setValue("description", teamA && teamB ? `${teamA} vs ${teamB}` : "");
                }}
                data-testid="button-team-picker"
              >
                Use team picker instead
              </button>
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isIndividualSport
                          ? "e.g. Canelo vs Benavidez"
                          : hasTeams && !manualDesc
                            ? "Auto-filled from team selection"
                            : "e.g. Rangers ML -142"
                      }
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

            {/* Odds */}
            <FormField
              control={form.control}
              name="odds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Odds</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. -142 or +230" {...field} data-testid="input-odds" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Hidden fields for parlay mode (auto-synced) */}
        {isParlay && (
          <>
            <input type="hidden" {...form.register("sport")} />
            <input type="hidden" {...form.register("description")} />
            <input type="hidden" {...form.register("odds")} />
          </>
        )}

        {/* Sportsbook + Stake (always visible) */}
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
                      <SelectItem key={s} value={s}>{s}</SelectItem>
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional context..."
                  className="resize-none h-16"
                  {...field}
                  data-testid="input-notes"
                />
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
          ) : (
            isParlay ? `Log ${parlayLegs.length}-Leg Parlay` : "Log Bet"
          )}
        </Button>
      </form>
    </Form>
  );
}
