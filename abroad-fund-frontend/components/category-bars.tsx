import { formatRs } from "@/lib/money";
import type { CategoryTotal } from "@/lib/ledger";

export function CategoryBars({
  items,
  empty,
}: {
  items: CategoryTotal[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...items.map((item) => item.amount));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.type}:${item.category}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{item.category}</span>
            <span
              className={item.type === "in" ? "text-money-in tabular-nums" : "text-money-out tabular-nums"}
            >
              {formatRs(item.amount)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-brass/15">
            <div
              className={item.type === "in" ? "h-2 rounded-full bg-money-in" : "h-2 rounded-full bg-money-out"}
              style={{ width: `${Math.max(4, (item.amount / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
