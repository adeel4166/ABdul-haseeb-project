import { readEntries, readSettings } from "@/lib/storage";
import type { EntryInput, LedgerSnapshot } from "@/lib/types";

const KEY_STORAGE = "abroad-fund.desk-key";

export class DeskError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export function deskKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function saveDeskKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key);
}

function headers(): HeadersInit {
  const key = deskKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { "x-desk-key": key } : {}),
  };
}

function ledgerUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  if (!base) {
    throw new DeskError("Set NEXT_PUBLIC_API_URL to the VPS API address.", "unconfigured");
  }
  return `${base}/api/ledger`;
}

async function request(init?: RequestInit): Promise<LedgerSnapshot> {
  let response: Response;
  try {
    response = await fetch(ledgerUrl(), {
      ...init,
      headers: { ...headers(), ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new DeskError("The desk server could not be reached. Check that the VPS API is running.");
  }
  const body = (await response.json().catch(() => null)) as { error?: string; code?: string } | LedgerSnapshot | null;
  if (!response.ok) {
    const message =
      body && "error" in body && typeof body.error === "string" ? body.error : "The shared desk could not be reached.";
    const code = body && "code" in body && typeof body.code === "string" ? body.code : undefined;
    throw new DeskError(message, code);
  }
  return body as LedgerSnapshot;
}

export function fetchLedger() {
  return request();
}

export function postLedger(body: unknown) {
  return request({ method: "POST", body: JSON.stringify(body) });
}

export function addEntryRequest(input: EntryInput) {
  return postLedger({ op: "add", input });
}

export function updateEntryRequest(id: string, input: EntryInput) {
  return postLedger({ op: "update", id, input });
}

export function deleteEntryRequest(id: string) {
  return postLedger({ op: "delete", id });
}

export function saveSettingsRequest(accountName: string, openingBalance: number, target: number) {
  return postLedger({ op: "settings", accountName, openingBalance, target });
}

export function replaceLedgerRequest(
  accountName: string,
  openingBalance: number,
  target: number,
  entries: unknown,
) {
  return postLedger({ op: "replace", accountName, openingBalance, target, entries });
}

export function clearLedgerRequest() {
  return postLedger({ op: "clear" });
}

export function legacyLedger() {
  return {
    entries: readEntries(),
    settings: readSettings(),
  };
}
