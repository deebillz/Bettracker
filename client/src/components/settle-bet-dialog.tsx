import { useState, useEffect } from "react";
import type { BetWithLegs } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, MinusCircle, Loader2, Zap } from "lucide-react";
import { calcWin, formatAmericanOdds, settleAmounts, type BetResult } from "@shared/odds";
import { betTypeLabel } from "@/lib/constants";

export interface SettleInput {
  id: number;
  result: Exclude<BetResult, "pending">;
  payout?: number;
}

export default function SettleBetDialog({
  open,
  onOpenChange,
  bet,
  onSettle,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bet: BetWithLegs | null;
  onSettle: (data: SettleInput) => void;
  isPending: boolean;
}) {
  const [result, setResult] = useState<SettleInput["result"] | null>(null);
  const [customPayout, setCustomPayout] = useState("");

  useEffect(() => {
    setResult(null);
    setCustomPayout("");
  }, [bet]);

  if (!bet) return null;

  const win = calcWin(bet);
  const custom = customPayout.trim() !== "" && Number.isFinite(Number(customPayout)) ? Number(customPayout) : null;
  const amounts = result ? settleAmounts(bet, result, result === "lost" ? null : custom) : null;

  const handleConfirm = () => {
    if (!result) return;
    onSettle({ id: bet.id, result, ...(custom !== null && result !== "lost" ? { payout: custom } : {}) });
  };

  const options = [
    { value: "won", label: "Won", icon: CheckCircle, active: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { value: "lost", label: "Lost", icon: XCircle, active: "bg-red-600 hover:bg-red-700 text-white" },
    { value: "push", label: "Push", icon: MinusCircle, active: "bg-yellow-600 hover:bg-yellow-700 text-white" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle bet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{bet.description}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {bet.sport} · {betTypeLabel(bet.betType)} · {formatAmericanOdds(bet.odds)} · ${bet.stake.toFixed(2)} stake
            </p>
            {bet.boostPct ? (
              <p className="text-xs mt-1.5 flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Zap className="h-3 w-3" />
                {bet.boostPct}% boost → {formatAmericanOdds(win.boostedOdds)}, wins ${win.toWin.toFixed(2)}
                {bet.boostMaxWin != null ? ` (bonus capped at $${bet.boostMaxWin.toFixed(2)})` : ""}
              </p>
            ) : null}
            {bet.legs.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {bet.legs.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="truncate">{l.pick}</span>
                    <span className="font-mono">{formatAmericanOdds(l.odds)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label className="text-xs mb-2 block">Result</Label>
            <div className="grid grid-cols-3 gap-2">
              {options.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  variant={result === o.value ? "default" : "outline"}
                  className={result === o.value ? o.active : ""}
                  onClick={() => setResult(o.value)}
                  data-testid={`button-result-${o.value}`}
                >
                  <o.icon className="mr-1.5 h-4 w-4" /> {o.label}
                </Button>
              ))}
            </div>
          </div>

          {result && result !== "lost" && (
            <div>
              <Label className="text-xs mb-2 block">
                Payout (calculated: ${(result === "won" ? win.payout : bet.stake).toFixed(2)})
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={(result === "won" ? win.payout : bet.stake).toFixed(2)}
                value={customPayout}
                onChange={(e) => setCustomPayout(e.target.value)}
                data-testid="input-custom-payout"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to use the calculated amount. Enter your own for a cash-out or a reduced parlay.
              </p>
            </div>
          )}

          {amounts && amounts.payout !== null && (
            <div className="rounded-lg border p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payout</span>
                <span className="font-mono">${amounts.payout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Profit/Loss</span>
                <span className={`font-mono font-bold ${amounts.profit! >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {amounts.profit! >= 0 ? "+" : "-"}${Math.abs(amounts.profit!).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-settle">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!result || isPending} data-testid="button-confirm-settle">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
