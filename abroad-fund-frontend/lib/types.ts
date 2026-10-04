export const IN_CATEGORIES = ["Top-up / Jama", "Refund", "Other"] as const;

export const OUT_CATEGORIES = [
  "Visa",
  "Degree Attestations",
  "University Letters",
  "Fooding Expense",
  "Shopping",
  "Application Apply Expense",
  "Language Test Expense",
  "Petrol+Food Expense",
  "Petrol",
  "Documentations",
  "Photocopies",
  "Pictures 4x4",
  "Driving License",
  "Travel ticket",
  "Visa / documents",
  "Bank charges",
  "Living",
  "Family / gift",
  "Other",
] as const;

export const NEW_CATEGORY = "__new__";
const CATEGORY_MAX = 60;

export type EntryType = "in" | "out";
export type InCategory = (typeof IN_CATEGORIES)[number];
export type OutCategory = (typeof OUT_CATEGORIES)[number];

export type Entry = {
  id: string;
  type: EntryType;
  amount: number;
  date: string;
  category: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type EntryInput = {
  type: EntryType;
  amount: number;
  date: string;
  category: string;
  note: string;
};

export type EntryWithBalance = Entry & {
  balanceAfter: number;
};

export type Settings = {
  accountName: string;
  openingBalance: number;
  target: number;
};

export type LedgerFile = {
  version: 1;
  exportedAt: string;
  accountName: string;
  openingBalance: number;
  target: number;
  entries: Entry[];
};

export type SavedLedger = {
  revision: number;
  accountName: string;
  openingBalance: number;
  target: number;
  entries: Entry[];
};

export type LedgerSnapshot = SavedLedger & {
  storage: "mysql";
  requiresKey: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  accountName: "Abroad Fund",
  openingBalance: 0,
  target: 0,
};

export function categoriesFor(type: EntryType): readonly string[] {
  return type === "in" ? IN_CATEGORIES : OUT_CATEGORIES;
}

export function normalizeCategory(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || cleaned.length > CATEGORY_MAX || cleaned === NEW_CATEGORY) return null;
  return cleaned;
}

export function isValidCategory(_type: EntryType, category: string): boolean {
  return normalizeCategory(category) === category;
}

export function categoryChoices(type: EntryType, used: readonly string[]): string[] {
  const presets = [...categoriesFor(type)];
  const extras = [...new Set(used.filter((item) => item && !presets.includes(item)))].sort((a, b) =>
    a.localeCompare(b),
  );
  return [...presets, ...extras];
}
