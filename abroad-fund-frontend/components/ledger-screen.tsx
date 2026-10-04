"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntryDialog } from "@/components/entry-dialog";
import { EntryRow } from "@/components/entry-row";
import { todayISO } from "@/lib/dates";
import { useLedger } from "@/lib/ledger-context";
import { categoryChoices, type EntryWithBalance } from "@/lib/types";

type Period = "all" | "today" | "month" | "year";
type TypeFilter = "all" | "in" | "out";

export function LedgerScreen() {
  const { entries, remaining, updateEntry, deleteEntry } = useLedger();
  const [period, setPeriod] = useState<Period>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EntryWithBalance | null>(null);
  const [editKey, setEditKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<EntryWithBalance | null>(null);
  const today = todayISO();
  const inChoices = useMemo(
    () => categoryChoices("in", entries.filter((entry) => entry.type === "in").map((entry) => entry.category)),
    [entries],
  );
  const outChoices = useMemo(
    () => categoryChoices("out", entries.filter((entry) => entry.type === "out").map((entry) => entry.category)),
    [entries],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (period === "today" && entry.date !== today) return false;
        if (period === "month" && !entry.date.startsWith(today.slice(0, 7))) return false;
        if (period === "year" && !entry.date.startsWith(today.slice(0, 4))) return false;
        if (type !== "all" && entry.type !== type) return false;
        if (category !== "all" && `${entry.type}:${entry.category}` !== category) return false;
        if (needle && !entry.note.toLowerCase().includes(needle)) return false;
        return true;
      })
      .toReversed();
  }, [entries, period, type, category, query, today]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl text-ink sm:text-3xl">Ledger</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every row shows what was left after that entry. Filters do not change that figure.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Search notes
          <input
            className="field w-full"
            value={query}
            placeholder="Ticket, visa, family…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          When
          <select className="field w-full" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Type
          <select
            className="field w-full"
            value={type}
            onChange={(event) => setType(event.target.value as TypeFilter)}
          >
            <option value="all">All types</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Category
          <select className="field w-full" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            <optgroup label="Money in">
              {inChoices.map((item) => (
                <option key={`in-${item}`} value={`in:${item}`}>
                  {item}
                </option>
              ))}
            </optgroup>
            <optgroup label="Money out">
              {outChoices.map((item) => (
                <option key={`out-${item}`} value={`out:${item}`}>
                  {item}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <p className="text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? "entry" : "entries"}
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-ink">No entries yet. Add a top-up from the button above.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-ink">No entries match these filters.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onEdit={() => {
                setEditKey((key) => key + 1);
                setEditing(entry);
              }}
              onDelete={() => setPendingDelete(entry)}
            />
          ))}
        </div>
      )}

      <EntryDialog
        key={editKey}
        open={editing !== null}
        title="Edit entry"
        description="Saving recalculates the balance left after this entry and every later one."
        initial={editing}
        remaining={remaining}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSubmit={async (input) => {
          if (editing) await updateEntry(editing.id, input);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this entry?"
        description="The remaining balance updates on every device that shares this desk."
        confirmLabel="Delete"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) return;
          const id = pendingDelete.id;
          setPendingDelete(null);
          void deleteEntry(id).catch(() => undefined);
        }}
      />
    </div>
  );
}
