"use client";

import { useMemo, useState } from "react";
import { CategoryBars } from "@/components/category-bars";
import { MONTH_NAMES, currentYearMonth } from "@/lib/dates";
import { yearSnapshot } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import { formatRs } from "@/lib/money";
import { cn } from "cn";

export function YearScreen() {
  const { entries, settings } = useLedger();
  const current = currentYearMonth();
  const [year, setYear] = useState(current.year);
  const years = useMemo(() => {
    const fromEntries = entries.map((entry) => Number(entry.date.slice(0, 4)));
    const min = Math.min(current.year - 1, ...fromEntries);
    const max = Math.max(current.year + 1, ...fromEntries);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, [entries, current.year]);
  const snapshot = yearSnapshot(entries, settings.openingBalance, year);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-ink sm:text-3xl">Year</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Closing is what remains at the end of that month, including the opening balance and earlier entries.
          </p>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Year
          <select className="field w-auto" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-brass/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-medium">Month</th>
              <th className="px-3 py-2 text-right font-medium">In</th>
              <th className="px-3 py-2 text-right font-medium">Out</th>
              <th className="py-2 pl-3 text-right font-medium">Closing</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.months.map((item) => (
              <tr key={item.month} className="border-b border-brass/15">
                <th className="py-2 pr-3 text-left font-medium text-ink">{MONTH_NAMES[item.month - 1]}</th>
                <td className="px-3 py-2 text-right text-money-in tabular-nums">{formatRs(item.cameIn)}</td>
                <td className="px-3 py-2 text-right text-money-out tabular-nums">{formatRs(item.wentOut)}</td>
                <td
                  className={cn(
                    "py-2 pl-3 text-right tabular-nums",
                    item.closing < 0 ? "text-money-out" : "text-ink",
                  )}
                >
                  {formatRs(item.closing)}
                </td>
              </tr>
            ))}
            <tr>
              <th className="py-2 pr-3 text-left font-medium text-ink">Year</th>
              <td className="px-3 py-2 text-right font-medium text-money-in tabular-nums">
                {formatRs(snapshot.cameIn)}
              </td>
              <td className="px-3 py-2 text-right font-medium text-money-out tabular-nums">
                {formatRs(snapshot.wentOut)}
              </td>
              <td
                className={cn(
                  "py-2 pl-3 text-right font-medium tabular-nums",
                  snapshot.months[11].closing < 0 ? "text-money-out" : "text-ink",
                )}
              >
                {formatRs(snapshot.months[11].closing)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section>
        <h3 className="font-heading text-2xl text-ink">Categories</h3>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Totals for entries dated in {year}.</p>
        <CategoryBars items={snapshot.categories} empty="No entries in this year." totalAmount={settings.target > 0 ? settings.target : (settings.openingBalance + entries.filter(e => e.type === "in").reduce((sum, e) => sum + e.amount, 0))} />
      </section>
    </div>
  );
}
