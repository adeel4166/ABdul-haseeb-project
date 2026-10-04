import { parseLedgerFile } from "@/lib/ledger";
import { DEFAULT_SETTINGS, type Entry, type Settings } from "@/lib/types";

const ENTRIES_KEY = "abroad-fund.entries.v1";
const SETTINGS_KEY = "abroad-fund.settings.v1";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function readEntries(): Entry[] {
  const parsed = parseLedgerFile({
    version: 1,
    accountName: DEFAULT_SETTINGS.accountName,
    openingBalance: 0,
    entries: readJson(ENTRIES_KEY) ?? [],
  });
  return parsed.ok ? parsed.file.entries : [];
}

export function readSettings(): Settings {
  const raw = readJson(SETTINGS_KEY);
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };
  const record = raw as Record<string, unknown>;
  const accountName =
    typeof record.accountName === "string" && record.accountName.trim()
      ? record.accountName.trim()
      : DEFAULT_SETTINGS.accountName;
  const openingBalance =
    typeof record.openingBalance === "number" &&
    Number.isFinite(record.openingBalance) &&
    record.openingBalance >= 0
      ? record.openingBalance
      : 0;
  const target =
    typeof record.target === "number" && Number.isFinite(record.target) && record.target >= 0 ? record.target : 0;
  return { accountName, openingBalance, target };
}

export function writeEntries(entries: Entry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function writeSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
