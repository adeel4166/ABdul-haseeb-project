import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/dates";
import { formatRs, formatSignedRs } from "@/lib/money";
import type { EntryWithBalance } from "@/lib/types";
import { cn } from "cn";

export function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntryWithBalance;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="rounded-xl border border-brass/30 bg-white/40 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{formatLongDate(entry.date)}</p>
          <p className="mt-0.5 font-medium text-ink">
            <span className={entry.type === "in" ? "text-money-in" : "text-money-out"}>
              {entry.type === "in" ? "In" : "Out"}
            </span>
            <span className="text-muted-foreground"> · </span>
            {entry.category}
          </p>
          {entry.note ? <p className="mt-1 text-sm break-words text-muted-foreground">{entry.note}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-medium tabular-nums",
              entry.type === "in" ? "text-money-in" : "text-money-out",
            )}
          >
            {formatSignedRs(entry.amount, entry.type)}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs tabular-nums",
              entry.balanceAfter < 0 ? "text-money-out" : "text-muted-foreground",
            )}
          >
            Left {formatRs(entry.balanceAfter)}
          </p>
        </div>
      </div>
      {onEdit || onDelete ? (
        <div className="mt-3 flex gap-2">
          {onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
