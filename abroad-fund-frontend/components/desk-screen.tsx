"use client";

import { CategoryBars } from "@/components/category-bars";
import { EntryRow } from "@/components/entry-row";
import { StatTile } from "@/components/stat-tile";
import { useAddEntry } from "@/components/add-entry";
import { Button } from "@/components/ui/button";
import { formatLongDate, todayISO } from "@/lib/dates";
import { categoryTotals, deskSnapshot } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import { formatRs, roundRupees } from "@/lib/money";
import { cn } from "cn";

export function DeskScreen() {
  const openAdd = useAddEntry();
  const { entries, settings, remaining } = useLedger();
  const today = todayISO();
  const desk = deskSnapshot(entries, settings.openingBalance, today);
  const allSpending = categoryTotals(entries, "out");
  const spent = roundRupees(allSpending.reduce((sum, item) => sum + item.amount, 0));
  const empty = entries.length === 0;
  const gap = settings.target > 0 ? roundRupees(settings.target - remaining) : 0;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[11px] tracking-[0.16em] text-brass-deep uppercase">Remaining</p>
        <p
          className={cn(
            "mt-1 font-heading text-4xl tabular-nums break-words sm:text-5xl lg:text-6xl",
            remaining < 0 ? "text-money-out" : remaining > 0 ? "text-money-in" : "text-ink",
          )}
        >
          {formatRs(remaining)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Opening {formatRs(settings.openingBalance)} + money in − money out
        </p>
        {settings.target > 0 ? (
          <p className={cn("mt-1 text-sm", gap > 0 ? "text-ink" : "text-money-in")}>
            Target {formatRs(settings.target)}.
            {gap > 0
              ? ` ${formatRs(gap)} still to reach it.`
              : gap < 0
                ? ` ${formatRs(Math.abs(gap))} past the target.`
                : " The remaining balance matches the target."}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No trip target yet. Set one in Setup when you know how much you want before you go.
          </p>
        )}
        {remaining < 0 ? (
          <p className="mt-1 text-sm text-money-out">You have spent more than you deposited.</p>
        ) : null}
        {empty ? (
          <div className="mt-4 rounded-xl border border-dashed border-brass/50 bg-white/35 px-4 py-4">
            <p className="text-sm text-ink">
              No entries yet. Add the first top-up — money you put into this account. It is saved to the shared
              desk, so your phone and laptop show the same balance.
            </p>
            <Button type="button" className="mt-3 h-10" onClick={openAdd}>
              Add first top-up
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
        <StatTile label="Today in" value={formatRs(desk.todayIn)} tone="in" hint={formatLongDate(today)} />
        <StatTile label="Today out" value={formatRs(desk.todayOut)} tone="out" hint={formatLongDate(today)} />
        <StatTile label="Last 7 days spent" value={formatRs(desk.last7Spent)} tone="out" hint="Money out, including today" />
        <StatTile
          label="This month left"
          value={formatRs(desk.monthLeft)}
          tone={desk.monthLeft < 0 ? "out" : "plain"}
          hint="Balance after entries dated this month or earlier"
        />
        <StatTile
          label="This year left"
          value={formatRs(desk.yearLeft)}
          tone={desk.yearLeft < 0 ? "out" : "plain"}
          hint="Balance after entries dated this year or earlier"
        />
        <StatTile
          label="Largest single spend"
          value={desk.largest ? formatRs(desk.largest.amount) : "None yet"}
          tone={desk.largest ? "out" : "plain"}
          hint={
            desk.largest
              ? `${desk.largest.category} · ${formatLongDate(desk.largest.date)}`
              : "No money out yet"
          }
        />
      </section>

      <section>
        <h2 className="font-heading text-2xl text-ink">All spending by category</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Money out for the whole trip, every month.
          {spent > 0 ? ` Total spent ${formatRs(spent)}.` : ""}
        </p>
        <CategoryBars items={allSpending} empty="No spending yet." />
      </section>

      <section>
        <h2 className="font-heading text-2xl text-ink">This month by category</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Money out only, for the current month.</p>
        <CategoryBars items={desk.monthCategories} empty="No spending this month yet." />
      </section>

      <section>
        <h2 className="font-heading text-2xl text-ink">Latest entries</h2>
        {desk.latest.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Entries you save will show up here.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {desk.latest.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
