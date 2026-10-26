import { useSyncExternalStore } from "react";
import { dismissAllToasts } from "@/hooks/use-toast";

/** Values that can pre-fill the Log Bet form (used by "Log again"). */
export interface BetPrefill {
  betType: string;
  sport: string;
  description: string;
  odds: string; // "-110" / "+150"
  stake: string;
  sportsbook: string | null;
  boostPct: number | null;
  boostMaxWin: number | null;
  legs: { sport: string; pick: string; odds: string }[];
}

interface State {
  open: boolean;
  prefill: BetPrefill | null;
  version: number; // changes every time the form opens, so it resets cleanly
}

let state: State = { open: false, prefill: null, version: 0 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Opens the Log Bet form from anywhere, optionally pre-filled. */
export function openBetForm(prefill: BetPrefill | null = null) {
  if (state.open && !prefill) return; // already open: keep what's typed
  dismissAllToasts(); // never let a confirmation cover the form
  state = { open: true, prefill, version: state.version + 1 };
  emit();
}

export function closeBetForm() {
  state = { ...state, open: false };
  emit();
}

export function useBetFormState(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
