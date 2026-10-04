import { readEntries, readSettings } from "@/lib/storage";
import type { EntryInput, LedgerSnapshot } from "@/lib/types";

const KEY_STORAGE = "abroad-fund.token";

export class DeskError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function saveToken(key: string) {
  if (!key) {
    localStorage.removeItem(KEY_STORAGE);
  } else {
    localStorage.setItem(KEY_STORAGE, key);
  }
}

function headers(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
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

export async function loginRequest(username: string, password: string): Promise<{token: string, user: {role: string}}> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function signupRequest(username: string, password: string): Promise<any> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  const res = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data;
}

export async function getMeRequest() {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  const res = await fetch(`${base}/api/auth/me`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch user");
  return data.user;
}

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  const res = await fetch(`${base}/api/auth/change-password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to change password");
  return data;
}

export async function getAdminUsersRequest() {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  const res = await fetch(`${base}/api/admin/users`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch users");
  return data.users;
}

export async function deleteAdminUserRequest(id: number) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  const res = await fetch(`${base}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete user");
  return data;
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
