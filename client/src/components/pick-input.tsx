import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { TEAMS_BY_SPORT } from "@/data/teams";
import { cn } from "@/lib/utils";

const isWord = (w: string) => /^[a-zà-ÿ.&'()-]+$/i.test(w) && !/^(vs\.?|v|over|under|o|u|ml)$/i.test(w);

/**
 * Splits "Jets vs Bil" into the part already settled ("Jets vs ") and the part being
 * typed ("Bil"), so suggestions only replace the team you're on.
 */
function activeSegment(text: string): { head: string; seg: string } {
  const m = text.match(/^(.*(?:\s+vs\.?\s+|\s*\/\s*))(.*)$/i);
  return m ? { head: m[1], seg: m[2] } : { head: "", seg: text };
}

/** Teams whose words start with every word typed: "ny je" → New York Jets. */
export function suggestTeams(teams: string[], segment: string, limit = 6): string[] {
  const words = segment.toLowerCase().split(/\s+/).filter(isWord);
  if (words.length === 0 || words.join("").length < 2) return [];
  if (teams.some((t) => segment.toLowerCase().startsWith(t.toLowerCase()))) return []; // already a full name
  const scored: { t: string; score: number }[] = [];
  for (const t of teams) {
    const tw = t.toLowerCase().split(/\s+/);
    if (!words.every((w) => tw.some((x) => x.startsWith(w)))) continue;
    // Prefer nickname / first-word matches ("jets" → New York Jets before Jets-something)
    const score = (tw[tw.length - 1].startsWith(words[0]) ? 0 : 1) + (tw[0].startsWith(words[0]) ? 0 : 1);
    scored.push({ t, score });
  }
  return scored.sort((a, b) => a.score - b.score || a.t.localeCompare(b.t)).slice(0, limit).map((s) => s.t);
}

const SEARCH_ORDER = ["NFL", "NBA", "MLB", "NHL", "College Football", "College Basketball", "Soccer"];
const SHORT: Record<string, string> = { "College Football": "NCAAF", "College Basketball": "NCAAB" };

export interface PickSuggestion {
  team: string;
  sport: string;
}

/**
 * Suggestions from the chosen sport first, then other sports, so typing "knicks"
 * while NFL is selected still finds the New York Knicks (and switches the sport).
 */
export function suggestPicks(sport: string, segment: string, limit = 6): PickSuggestion[] {
  const out: PickSuggestion[] = [];
  const seen = new Set<string>();
  const order = [sport, ...SEARCH_ORDER.filter((s) => s !== sport)];
  for (const sp of order) {
    const teams = TEAMS_BY_SPORT[sp];
    if (!teams) continue;
    for (const team of suggestTeams(teams, segment, limit)) {
      if (seen.has(team) || out.length >= limit) continue;
      seen.add(team);
      out.push({ team, sport: sp });
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** Replaces the typed words with the team name and keeps any line the user typed ("+3.5"). */
export function applySuggestion(text: string, team: string): string {
  const { head, seg } = activeSegment(text);
  const extras = seg
    .split(/\s+/)
    .filter((w) => w && !isWord(w))
    .map((w) => (/^ml$/i.test(w) ? "ML" : /^(over|under)$/i.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w));
  return `${head}${team}${extras.length ? " " + extras.join(" ") : ""} `;
}

export default function PickInput({
  sport,
  value,
  onChange,
  placeholder,
  testId,
  invalid,
  className,
  onSportChange,
}: {
  sport: string;
  value: string;
  onChange: (v: string) => void;
  /** Called when a suggestion from another sport is picked */
  onSportChange?: (sport: string) => void;
  placeholder?: string;
  testId?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => suggestPicks(sport, activeSegment(value).seg), [sport, value]);
  const open = focused && suggestions.length > 0;

  const choose = ({ team, sport: teamSport }: PickSuggestion) => {
    onChange(applySuggestion(value, team));
    if (teamSport !== sport) onSportChange?.(teamSport);
    setActive(0);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" || e.key === "Tab") {
            if (suggestions[active]) {
              e.preventDefault();
              choose(suggestions[active]);
            }
          } else if (e.key === "Escape") {
            setFocused(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="words"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-invalid={invalid}
        className={cn("h-9 text-sm", invalid && "border-destructive")}
        data-testid={testId}
      />
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover py-1 text-sm shadow-md"
          data-testid={testId ? `${testId}-suggestions` : undefined}
        >
          {suggestions.map((t, i) => (
            <li
              key={t.team + t.sport}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input keeps focus on phones and desktops
              onMouseDown={(e) => {
                e.preventDefault();
                choose(t);
              }}
              className={cn("flex cursor-pointer items-center justify-between gap-2 px-3 py-2", i === active && "bg-accent text-accent-foreground")}
            >
              <span>{t.team}</span>
              {t.sport !== sport && <span className="text-xs text-muted-foreground">{SHORT[t.sport] ?? t.sport}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
