import { isISODate } from "@/lib/dates";
import { applyEntryUpdate, createEntry, parseLedgerFile } from "@/lib/ledger";
import { roundRupees } from "@/lib/money";
import {
  DEFAULT_SETTINGS,
  type EntryInput,
  type SavedLedger,
  normalizeCategory,
} from "@/lib/types";

export function emptyLedger(): SavedLedger {
  return {
    revision: 0,
    accountName: DEFAULT_SETTINGS.accountName,
    openingBalance: 0,
    target: 0,
    entries: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseEntryInput(value: unknown): { ok: true; input: EntryInput } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "That entry is incomplete." };
  if (value.type !== "in" && value.type !== "out") {
    return { ok: false, error: "Choose money in or money out." };
  }
  if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (typeof value.date !== "string" || !isISODate(value.date)) {
    return { ok: false, error: "Pick a real date." };
  }
  const category = typeof value.category === "string" ? normalizeCategory(value.category) : null;
  if (!category) {
    return { ok: false, error: "Enter a category, or pick one from the list." };
  }
  if (value.note !== undefined && typeof value.note !== "string") {
    return { ok: false, error: "The note must be text." };
  }
  return {
    ok: true,
    input: {
      type: value.type,
      amount: roundRupees(value.amount),
      date: value.date,
      category,
      note: typeof value.note === "string" ? value.note.trim() : "",
    },
  };
}

function readNonNegative(value: unknown, label: string): { ok: true; amount: number } | { ok: false; error: string } {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { ok: false, error: `${label} must be zero or more.` };
  }
  return { ok: true, amount: roundRupees(value) };
}

function parseSettings(
  value: Record<string, unknown>,
): { ok: true; accountName: string; openingBalance: number; target: number } | { ok: false; error: string } {
  if (typeof value.accountName !== "string" || value.accountName.trim().length === 0) {
    return { ok: false, error: "The account needs a name." };
  }
  const opening = readNonNegative(value.openingBalance, "Opening balance");
  if (!opening.ok) return opening;
  const target = readNonNegative(value.target ?? 0, "Trip target");
  if (!target.ok) return target;
  return {
    ok: true,
    accountName: value.accountName.trim(),
    openingBalance: opening.amount,
    target: target.amount,
  };
}

export function applyLedgerOp(
  current: SavedLedger,
  body: unknown,
): { ok: true; ledger: SavedLedger } | { ok: false; error: string } {
  if (!isRecord(body) || typeof body.op !== "string") {
    return { ok: false, error: "The desk did not understand that change." };
  }

  if (body.op === "add") {
    const parsed = parseEntryInput(body.input);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        entries: [...current.entries, createEntry(parsed.input)],
      },
    };
  }

  if (body.op === "update") {
    if (typeof body.id !== "string") return { ok: false, error: "That entry could not be found." };
    const parsed = parseEntryInput(body.input);
    if (!parsed.ok) return parsed;
    const existing = current.entries.find((entry) => entry.id === body.id);
    if (!existing) return { ok: false, error: "That entry is no longer on the desk. Refresh and try again." };
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        entries: current.entries.map((entry) =>
          entry.id === body.id ? applyEntryUpdate(entry, parsed.input) : entry,
        ),
      },
    };
  }

  if (body.op === "delete") {
    if (typeof body.id !== "string") return { ok: false, error: "That entry could not be found." };
    if (!current.entries.some((entry) => entry.id === body.id)) {
      return { ok: false, error: "That entry is no longer on the desk. Refresh and try again." };
    }
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        entries: current.entries.filter((entry) => entry.id !== body.id),
      },
    };
  }

  if (body.op === "settings") {
    const parsed = parseSettings(body);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        accountName: parsed.accountName,
        openingBalance: parsed.openingBalance,
        target: parsed.target,
      },
    };
  }

  if (body.op === "replace") {
    const parsed = parseLedgerFile({
      version: 1,
      accountName: body.accountName,
      openingBalance: body.openingBalance,
      target: body.target,
      entries: body.entries,
    });
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      ledger: {
        revision: current.revision + 1,
        accountName: parsed.file.accountName,
        openingBalance: parsed.file.openingBalance,
        target: parsed.file.target,
        entries: parsed.file.entries,
      },
    };
  }

  if (body.op === "clear") {
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        entries: [],
      },
    };
  }

  return { ok: false, error: "The desk did not understand that change." };
}
