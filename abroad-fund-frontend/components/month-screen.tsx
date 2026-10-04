"use client";

import { useMemo, useState } from "react";
import { CategoryBars } from "@/components/category-bars";
import { EntryRow } from "@/components/entry-row";
import { StatTile } from "@/components/stat-tile";
import { MONTH_NAMES, currentYearMonth } from "@/lib/dates";
import { monthSnapshot } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import { formatRs } from "@/lib/money";

export function MonthScreen() {
  const { entries, settings } = useLedger();
  const current = currentYearMonth();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const years = useYearChoices(entries, current.year);
  const snapshot = monthSnapshot(entries, settings.openingBalance, year, month);
  const peak = Math.max(...snapshot.daily.map((day) => day.spent), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-ink sm:text-3xl">Month</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Month
            <select
              className="field w-auto"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
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
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <StatTile label="Opening" value={formatRs(snapshot.opening)} tone={snapshot.opening < 0 ? "out" : "plain"} />
        <StatTile label="In" value={formatRs(snapshot.cameIn)} tone="in" />
        <StatTile label="Out" value={formatRs(snapshot.wentOut)} tone="out" />
        <StatTile label="Closing" value={formatRs(snapshot.closing)} tone={snapshot.closing < 0 ? "out" : "plain"} />
      </section>

      <section>
        <h3 className="font-heading text-2xl text-ink">Daily spending</h3>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Money out on each day of the month.</p>
        {peak === 0 ? (
          <p className="text-sm text-muted-foreground">No spending in this month.</p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex h-40 min-w-max items-end gap-1" role="img" aria-label="Daily money out">
              {snapshot.daily.map((day) => (
                <div key={day.date} className="flex w-6 flex-col items-center justify-end gap-1">
                  <div
                    className="w-3 rounded-t bg-money-out"
                    style={{ height: `${day.spent === 0 ? 0 : Math.max(6, (day.spent / peak) * 112)}px` }}
                    title={`${day.date}: ${formatRs(day.spent)}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-heading text-2xl text-ink">Categories</h3>
        <div className="mt-3">
          <CategoryBars items={snapshot.categories} empty="No entries in this month." />
        </div>
      </section>

      <section>
        <h3 className="font-heading text-2xl text-ink">Entries</h3>
        {snapshot.entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No entries in this month.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {snapshot.entries.toReversed().map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function useYearChoices(entries: { date: string }[], nowYear: number) {
  return useMemo(() => {
    const fromEntries = entries.map((entry) => Number(entry.date.slice(0, 4)));
    const min = Math.min(nowYear - 1, ...fromEntries);
    const max = Math.max(nowYear + 1, ...fromEntries);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, [entries, nowYear]);
}
