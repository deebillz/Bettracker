import { useState, useEffect } from "react";
import type { Bet } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, MinusCircle, Loader2 } from "lucide-react";

function calcPayout(odds: string, stake: number): number {
  const n = parseInt(odds);
  if (isNaN(n)) return stake;
  if (n > 0) return stake + (stake * n) / 100;
  if (n < 0) return stake + (stake * 100) / Math.abs(n);
  return stake;
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
  bet: Bet | null;
  onSettle: (data: { id: number; result: string; payout: number; profit: number }) => void;
  isPending: boolean;
}) {
  const [result, setResult] = useState<"won" | "lost" | "push" | null>(null);
  const [customPayout, setCustomPayout] = useState("");

  useEffect(() => {
    setResult(null);
    setCustomPayout("");
  }, [bet]);

  if (!bet) return null;

  const autoPayout = result === "won" ? calcPayout(bet.odds, bet.stake) : result === "push" ? bet.stake : 0;
  const finalPayout = customPayout ? parseFloat(customPayout) : autoPayout;
  const profit = result === "lost" ? -bet.stake : finalPayout - bet.stake;

  const handleConfirm = () => {
    if (!result) return;
    onSettle({
      id: bet.id,
      result,
      payout: Math.round(finalPayout * 100) / 100,
      profit: Math.round(profit * 100) / 100,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle Bet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{bet.description}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {bet.sport} · {bet.betType} · {bet.odds} · ${bet.stake.toFixed(2)} stake
            </p>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Result</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={result === "won" ? "default" : "outline"}
                className={result === "won" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                onClick={() => setResult("won")}
                data-testid="button-result-won"
              >
                <CheckCircle className="mr-1.5 h-4 w-4" /> Won
              </Button>
              <Button
                type="button"
                variant={result === "lost" ? "default" : "outline"}
                className={result === "lost" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                onClick={() => setResult("lost")}
                data-testid="button-result-lost"
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Lost
              </Button>
              <Button
                type="button"
                variant={result === "push" ? "default" : "outline"}
                className={result === "push" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
                onClick={() => setResult("push")}
                data-testid="button-result-push"
              >
                <MinusCircle className="mr-1.5 h-4 w-4" /> Push
              </Button>
            </div>
          </div>

          {result === "won" && (
            <div>
              <Label className="text-xs mb-2 block">
                Payout (auto-calculated: ${autoPayout.toFixed(2)})
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={autoPayout.toFixed(2)}
                value={customPayout}
                onChange={(e) => setCustomPayout(e.target.value)}
                data-testid="input-custom-payout"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to use auto-calculated payout based on odds.
              </p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payout</span>
                <span className="font-mono">${finalPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Profit/Loss</span>
                <span className={`font-mono font-bold ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
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
