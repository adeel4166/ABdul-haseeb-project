"use client";

import { useState } from "react";
import { EntryRow } from "@/components/entry-row";
import { StatTile } from "@/components/stat-tile";
import { formatLongDate, todayISO } from "@/lib/dates";
import { daySnapshot } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import { formatRs } from "@/lib/money";

export function TodayScreen() {
  const { entries, settings } = useLedger();
  const [date, setDate] = useState(todayISO());
  const day = daySnapshot(entries, settings.openingBalance, date);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-ink sm:text-3xl">Today</h2>
          <p className="mt-1 text-sm text-muted-foreground">{formatLongDate(date)}</p>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Pick a day
          <input className="field w-full min-[420px]:w-auto" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <StatTile label="Opening" value={formatRs(day.opening)} tone={day.opening < 0 ? "out" : "plain"} />
        <StatTile label="Came in" value={formatRs(day.cameIn)} tone="in" />
        <StatTile label="Went out" value={formatRs(day.wentOut)} tone="out" />
        <StatTile label="Closing" value={formatRs(day.closing)} tone={day.closing < 0 ? "out" : "plain"} />
      </section>

      <section>
        <h3 className="font-heading text-2xl text-ink">Entries</h3>
        {day.entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing recorded on this day.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {day.entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
