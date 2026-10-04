"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/dates";
import { useLedger } from "@/lib/ledger-context";
import { formatRs, parseRupees, roundRupees } from "@/lib/money";
import {
  NEW_CATEGORY,
  categoriesFor,
  categoryChoices,
  normalizeCategory,
  type Entry,
  type EntryInput,
  type EntryType,
} from "@/lib/types";
import { cn } from "cn";

const fieldClass = "h-10";

export function EntryDialog({
  open,
  title,
  description,
  initial,
  remaining,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  initial?: Entry | null;
  remaining: number;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: EntryInput) => Promise<void>;
}) {
  const { entries } = useLedger();
  const startingType = initial?.type ?? "in";
  const startingChoices = categoryChoices(
    startingType,
    entries.filter((entry) => entry.type === startingType).map((entry) => entry.category),
  );
  const initialCategory = initial?.category ?? startingChoices[0];
  const initialIsCustom = Boolean(initial) && !categoriesFor(startingType).includes(initialCategory);
  const [type, setType] = useState<EntryType>(startingType);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [category, setCategory] = useState(initialIsCustom ? categoriesFor(startingType)[0] : initialCategory);
  const [customOpen, setCustomOpen] = useState(initialIsCustom);
  const [customText, setCustomText] = useState(initialIsCustom ? initialCategory : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const saving = useRef(false);
  const choices = useMemo(
    () =>
      categoryChoices(
        type,
        entries.filter((entry) => entry.type === type).map((entry) => entry.category),
      ),
    [entries, type],
  );

  function chooseType(next: EntryType) {
    setType(next);
    if (customOpen) return;
    const nextChoices = categoryChoices(
      next,
      entries.filter((entry) => entry.type === next).map((entry) => entry.category),
    );
    if (!nextChoices.includes(category)) setCategory(nextChoices[0]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    const parsed = parseRupees(amount, false);
    if (parsed === null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    const chosen = customOpen ? normalizeCategory(customText) : normalizeCategory(category);
    if (!chosen) {
      setError(customOpen ? "Type the new category." : "Pick a category.");
      return;
    }
    saving.current = true;
    try {
      await onSubmit({ type, amount: parsed, date, category: chosen, note });
      setAmount("");
      onOpenChange(false);
    } catch (caught) {
      saving.current = false;
      setError(caught instanceof Error ? caught.message : "Could not save.");
    }
  }

  const parsed = parseRupees(amount, false);
  let preview = remaining;
  if (parsed !== null) {
    if (initial) {
      preview = roundRupees(preview - (initial.type === "in" ? initial.amount : -initial.amount));
    }
    preview = roundRupees(preview + (type === "in" ? parsed : -parsed));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pr-8">
            <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium",
                  type === "in"
                    ? "border-money-in bg-money-in text-white"
                    : "border-input text-muted-foreground",
                )}
                onClick={() => chooseType("in")}
              >
                Money in
              </button>
              <button
                type="button"
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium",
                  type === "out"
                    ? "border-money-out bg-money-out text-white"
                    : "border-input text-muted-foreground",
                )}
                onClick={() => chooseType("out")}
              >
                Money out
              </button>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="entry-amount">Amount (Rs)</Label>
              <Input
                id="entry-amount"
                className={fieldClass}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="entry-date">Date</Label>
              <Input
                id="entry-date"
                className={fieldClass}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="entry-category">Category</Label>
              <select
                id="entry-category"
                className="field w-full"
                value={customOpen ? NEW_CATEGORY : category}
                onChange={(event) => {
                  if (event.target.value === NEW_CATEGORY) {
                    setCustomOpen(true);
                    return;
                  }
                  setCustomOpen(false);
                  setCategory(event.target.value);
                }}
              >
                <option value={NEW_CATEGORY}>Add your own…</option>
                {choices.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              {customOpen ? (
                <Input
                  id="entry-category-custom"
                  className={fieldClass}
                  autoComplete="off"
                  placeholder="Type a new category"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                />
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="entry-note">Note</Label>
              <Textarea
                id="entry-note"
                placeholder="Optional"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <p className={cn("text-sm tabular-nums", preview < 0 ? "text-money-out" : "text-ink")}>
              Remaining after save: {formatRs(preview)}
            </p>
            {error ? (
              <p className="text-sm text-money-out" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-10">
              Save entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
