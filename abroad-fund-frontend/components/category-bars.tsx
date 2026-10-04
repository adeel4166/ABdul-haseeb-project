import { formatRs } from "@/lib/money";
import type { CategoryTotal } from "@/lib/ledger";

export function CategoryBars({
  items,
  empty,
  totalAmount,
}: {
  items: CategoryTotal[];
  empty: string;
  totalAmount?: number;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  
  // Use provided totalAmount, otherwise fallback to max category amount
  const max = totalAmount && totalAmount > 0 
    ? totalAmount 
    : Math.max(...items.map((item) => item.amount));

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        // Calculate percentage out of total
        const percentage = (item.amount / max) * 100;
        return (
          <li key={`${item.type}:${item.category}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">
                {item.category} 
                {totalAmount && totalAmount > 0 && (
                   <span className="text-xs text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                )}
              </span>
              <span
                className={item.type === "in" ? "text-money-in tabular-nums" : "text-money-out tabular-nums"}
              >
                {formatRs(item.amount)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-brass/15">
              <div
                className={item.type === "in" ? "h-2 rounded-full bg-money-in" : "h-2 rounded-full bg-money-out"}
                style={{ width: `${Math.max(1, percentage)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
