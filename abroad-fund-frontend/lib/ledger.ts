import { addDays, daysInMonth, endOfMonth, isISODate, monthKey } from "@/lib/dates";
import { roundRupees } from "@/lib/money";
import {
  DEFAULT_SETTINGS,
  type Entry,
  type EntryInput,
  type EntryType,
  type EntryWithBalance,
  type LedgerFile,
  normalizeCategory,
} from "@/lib/types";

export function compareEntries(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

export function withBalances(entries: Entry[], openingBalance: number): EntryWithBalance[] {
  let balance = roundRupees(openingBalance);
  return [...entries].sort(compareEntries).map((entry) => {
    balance = roundRupees(balance + (entry.type === "in" ? entry.amount : -entry.amount));
    return { ...entry, balanceAfter: balance };
  });
}

export function remainingBalance(entries: EntryWithBalance[], openingBalance: number): number {
  return entries.length > 0 ? entries[entries.length - 1].balanceAfter : roundRupees(openingBalance);
}

export function balanceThrough(
  entries: EntryWithBalance[],
  openingBalance: number,
  throughDate: string,
): number {
  let balance = roundRupees(openingBalance);
  for (const entry of entries) {
    if (entry.date > throughDate) break;
    balance = entry.balanceAfter;
  }
  return balance;
}

export function sumByType(entries: Entry[], type: EntryType): number {
  return roundRupees(
    entries.reduce((total, entry) => (entry.type === type ? total + entry.amount : total), 0),
  );
}

export type CategoryTotal = {
  type: EntryType;
  category: string;
  amount: number;
};

export function categoryTotals(entries: Entry[], type?: EntryType): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (type && entry.type !== type) continue;
    const key = `${entry.type}:${entry.category}`;
    totals.set(key, (totals.get(key) ?? 0) + entry.amount);
  }
  return [...totals.entries()]
    .map(([key, amount]) => {
      const split = key.indexOf(":");
      return {
        type: key.slice(0, split) as EntryType,
        category: key.slice(split + 1),
        amount: roundRupees(amount),
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

export function largestSpend(entries: EntryWithBalance[]): EntryWithBalance | null {
  let best: EntryWithBalance | null = null;
  for (const entry of entries) {
    if (entry.type !== "out") continue;
    if (
      !best ||
      entry.amount > best.amount ||
      (entry.amount === best.amount && compareEntries(best, entry) < 0)
    ) {
      best = entry;
    }
  }
  return best;
}

export function daySnapshot(entries: EntryWithBalance[], openingBalance: number, date: string) {
  const before = entries.filter((entry) => entry.date < date);
  const opening = before.length > 0 ? before[before.length - 1].balanceAfter : roundRupees(openingBalance);
  const dayEntries = entries.filter((entry) => entry.date === date);
  const cameIn = sumByType(dayEntries, "in");
  const wentOut = sumByType(dayEntries, "out");
  return {
    opening,
    cameIn,
    wentOut,
    closing: roundRupees(opening + cameIn - wentOut),
    entries: dayEntries,
  };
}

export function monthSnapshot(
  entries: EntryWithBalance[],
  openingBalance: number,
  year: number,
  month: number,
) {
  const start = `${monthKey(year, month)}-01`;
  const end = endOfMonth(year, month);
  const before = entries.filter((entry) => entry.date < start);
  const opening = before.length > 0 ? before[before.length - 1].balanceAfter : roundRupees(openingBalance);
  const monthEntries = entries.filter((entry) => entry.date >= start && entry.date <= end);
  const cameIn = sumByType(monthEntries, "in");
  const wentOut = sumByType(monthEntries, "out");
  const count = daysInMonth(year, month);
  const daily = Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const date = `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
    const spent = sumByType(
      monthEntries.filter((entry) => entry.date === date),
      "out",
    );
    return { date, day, spent };
  });

  return {
    opening,
    cameIn,
    wentOut,
    closing: roundRupees(opening + cameIn - wentOut),
    daily,
    categories: categoryTotals(monthEntries),
    entries: monthEntries,
  };
}

export function yearSnapshot(entries: EntryWithBalance[], openingBalance: number, year: number) {
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const snapshot = monthSnapshot(entries, openingBalance, year, month);
    return {
      month,
      cameIn: snapshot.cameIn,
      wentOut: snapshot.wentOut,
      closing: snapshot.closing,
    };
  });
  const yearEntries = entries.filter((entry) => entry.date.startsWith(`${year}-`));
  return {
    months,
    cameIn: sumByType(yearEntries, "in"),
    wentOut: sumByType(yearEntries, "out"),
    categories: categoryTotals(yearEntries),
  };
}

export function deskSnapshot(entries: EntryWithBalance[], openingBalance: number, today: string) {
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const weekStart = addDays(today, -6);
  const recent = entries.filter((entry) => entry.date >= weekStart && entry.date <= today);
  const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey(year, month)));

  return {
    remaining: remainingBalance(entries, openingBalance),
    todayIn: sumByType(
      entries.filter((entry) => entry.date === today),
      "in",
    ),
    todayOut: sumByType(
      entries.filter((entry) => entry.date === today),
      "out",
    ),
    last7Spent: sumByType(recent, "out"),
    monthLeft: balanceThrough(entries, openingBalance, endOfMonth(year, month)),
    yearLeft: balanceThrough(entries, openingBalance, `${year}-12-31`),
    largest: largestSpend(entries),
    monthCategories: categoryTotals(monthEntries, "out"),
    latest: [...entries].reverse().slice(0, 6),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseLedgerFile(raw: unknown): { ok: true; file: LedgerFile } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "That file is not a JSON object." };
  if (raw.version !== 1) return { ok: false, error: "This desk can only import version 1 files." };
  if (typeof raw.accountName !== "string" || raw.accountName.trim().length === 0) {
    return { ok: false, error: "The file needs an account name." };
  }
  if (typeof raw.openingBalance !== "number" || !Number.isFinite(raw.openingBalance) || raw.openingBalance < 0) {
    return { ok: false, error: "Opening balance must be a number of zero or more." };
  }
  const targetValue = raw.target === undefined ? 0 : raw.target;
  if (typeof targetValue !== "number" || !Number.isFinite(targetValue) || targetValue < 0) {
    return { ok: false, error: "Trip target must be zero or more." };
  }
  if (!Array.isArray(raw.entries)) return { ok: false, error: "The file has no entries list." };

  const seen = new Set<string>();
  const entries: Entry[] = [];

  for (let index = 0; index < raw.entries.length; index += 1) {
    const item = raw.entries[index];
    const label = `Entry ${index + 1}`;
    if (!isRecord(item)) return { ok: false, error: `${label} is not an object.` };
    if (item.type !== "in" && item.type !== "out") {
      return { ok: false, error: `${label} must be money in or money out.` };
    }
    if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0) {
      return { ok: false, error: `${label} needs an amount greater than zero.` };
    }
    if (typeof item.date !== "string" || !isISODate(item.date)) {
      return { ok: false, error: `${label} needs a real date.` };
    }
    const category = typeof item.category === "string" ? normalizeCategory(item.category) : null;
    if (!category) {
      return { ok: false, error: `${label} needs a category.` };
    }
    if (typeof item.note !== "string") return { ok: false, error: `${label} needs a note, even if it is blank.` };

    let id = typeof item.id === "string" && item.id.trim() ? item.id : crypto.randomUUID();
    if (seen.has(id)) id = crypto.randomUUID();
    seen.add(id);

    const now = new Date().toISOString();
    entries.push({
      id,
      type: item.type,
      amount: roundRupees(item.amount),
      date: item.date,
      category,
      note: item.note.trim(),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
    });
  }

  return {
    ok: true,
    file: {
      version: 1,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
      accountName: raw.accountName.trim(),
      openingBalance: roundRupees(raw.openingBalance),
      target: roundRupees(targetValue),
      entries,
    },
  };
}

export function createEntry(input: EntryInput): Entry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: input.type,
    amount: roundRupees(input.amount),
    date: input.date,
    category: input.category,
    note: input.note.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function applyEntryUpdate(entry: Entry, input: EntryInput): Entry {
  return {
    ...entry,
    type: input.type,
    amount: roundRupees(input.amount),
    date: input.date,
    category: input.category,
    note: input.note.trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function toLedgerFile(
  accountName: string,
  openingBalance: number,
  target: number,
  entries: Entry[],
): LedgerFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accountName,
    openingBalance,
    target,
    entries: entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: entry.amount,
      date: entry.date,
      category: entry.category,
      note: entry.note,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  };
}

export function emptySettings() {
  return { ...DEFAULT_SETTINGS };
}
