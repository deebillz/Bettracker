import { useState } from "react";
import type { BetWithLegs } from "@shared/schema";
import { calcWin, formatAmericanOdds } from "@shared/odds";
import { betTypeLabel } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Trash2, Gavel, MinusCircle, Zap } from "lucide-react";

function ResultBadge({ result }: { result: string }) {
  switch (result) {
    case "won":
      return (
        <Badge variant="default" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
          <CheckCircle className="mr-1 h-3 w-3" /> Won
        </Badge>
      );
    case "lost":
      return (
        <Badge variant="default" className="bg-red-500/15 text-red-500 border-red-500/20 hover:bg-red-500/20">
          <XCircle className="mr-1 h-3 w-3" /> Lost
        </Badge>
      );
    case "push":
      return (
        <Badge variant="default" className="bg-yellow-500/15 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">
          <MinusCircle className="mr-1 h-3 w-3" /> Push
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" /> Pending
        </Badge>
      );
  }
}

export default function BetHistory({
  bets,
  isLoading,
  onSettle,
  onDelete,
}: {
  bets: BetWithLegs[];
  isLoading: boolean;
  onSettle: (bet: BetWithLegs) => void;
  onDelete: (id: number) => void;
}) {
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<BetWithLegs | null>(null);

  const sports = Array.from(new Set(bets.map((b) => b.sport)));
  const types = Array.from(new Set(bets.map((b) => b.betType)));

  const filtered = bets.filter((b) => {
    if (sportFilter !== "all" && b.sport !== sportFilter) return false;
    if (typeFilter !== "all" && b.betType !== typeFilter) return false;
    if (resultFilter !== "all" && b.result !== resultFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="card-bet-history">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold">Bet History</h2>
        <div className="flex gap-2 flex-wrap">
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="filter-sport">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="filter-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>{betTypeLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="filter-result">
              <SelectValue placeholder="All Results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gavel className="mx-auto h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm font-medium">No bets found</p>
          <p className="text-xs mt-1">Log your first bet to start tracking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 text-xs">Date</TableHead>
                <TableHead className="text-xs">Sport</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-right">Odds</TableHead>
                <TableHead className="text-xs text-right">Stake</TableHead>
                <TableHead className="text-xs text-right">P/L</TableHead>
                <TableHead className="text-xs">Result</TableHead>
                <TableHead className="text-xs pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bet) => (
                <TableRow key={bet.id} data-testid={`row-bet-${bet.id}`}>
                  <TableCell className="pl-5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(bet.date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-xs font-medium">{bet.sport}</TableCell>
                  <TableCell className="text-xs">{betTypeLabel(bet.betType)}</TableCell>
                  <TableCell className="text-xs max-w-[240px]">
                    <div className="truncate" title={bet.description}>{bet.description}</div>
                    {bet.legs.length > 0 && (
                      <div className="text-[11px] text-muted-foreground truncate" title={bet.legs.map((l) => `${l.pick} (${formatAmericanOdds(l.odds)})`).join("\n")}>
                        {bet.legs.length} legs · {bet.sportsbook ?? ""}
                      </div>
                    )}
                    {bet.legs.length === 0 && bet.sportsbook && (
                      <div className="text-[11px] text-muted-foreground truncate">{bet.sportsbook}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono whitespace-nowrap">
                    <OddsCell bet={bet} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">${bet.stake.toFixed(2)}</TableCell>
                  <TableCell className={`text-xs text-right font-mono font-medium ${
                    bet.profit != null
                      ? bet.profit >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                      : "text-muted-foreground"
                  }`}>
                    {bet.profit != null ? (
                      `${bet.profit >= 0 ? "+" : "-"}$${Math.abs(bet.profit).toFixed(2)}`
                    ) : (
                      <span title="Potential winnings">to win ${calcWin(bet).toWin.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell><ResultBadge result={bet.result} /></TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {bet.result === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onSettle(bet)}
                          aria-label="Settle bet"
                          data-testid={`button-settle-${bet.id}`}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDelete(bet)}
                        aria-label="Delete bet"
                        data-testid={`button-delete-${bet.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bet?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.description} will be removed from your history and stats. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function OddsCell({ bet }: { bet: BetWithLegs }) {
  if (!bet.boostPct) return <>{formatAmericanOdds(bet.odds)}</>;
  const { boostedOdds } = calcWin(bet);
  return (
    <span title={`${formatAmericanOdds(bet.odds)} with a ${bet.boostPct}% boost`} className="inline-flex items-center gap-1">
      <span className="text-muted-foreground line-through">{formatAmericanOdds(bet.odds)}</span>
      <span className="text-amber-600 dark:text-amber-400 inline-flex items-center">
        <Zap className="h-3 w-3" />
        {formatAmericanOdds(boostedOdds)}
      </span>
    </span>
  );
}
