"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DeskError,
  addEntryRequest,
  clearLedgerRequest,
  deleteEntryRequest,
  fetchLedger,
  legacyLedger,
  replaceLedgerRequest,
  saveDeskKey,
  saveSettingsRequest,
  updateEntryRequest,
} from "@/lib/desk-api";
import { remainingBalance, withBalances } from "@/lib/ledger";
import {
  DEFAULT_SETTINGS,
  type Entry,
  type EntryInput,
  type EntryWithBalance,
  type LedgerFile,
  type LedgerSnapshot,
  type Settings,
} from "@/lib/types";

type LedgerContextValue = {
  ready: boolean;
  saving: boolean;
  needsKey: boolean;
  unconfigured: boolean;
  syncError: string;
  storageMode: "mysql" | null;
  requiresKey: boolean;
  settings: Settings;
  entries: EntryWithBalance[];
  remaining: number;
  unlock: (key: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  addEntry: (input: EntryInput) => Promise<void>;
  updateEntry: (id: string, input: EntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  replaceLedger: (file: LedgerFile) => Promise<void>;
  clearEntries: () => Promise<void>;
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [storageMode, setStorageMode] = useState<"mysql" | null>(null);
  const [requiresKey, setRequiresKey] = useState(false);
  const revision = useRef(0);

  function apply(snapshot: LedgerSnapshot) {
    if (snapshot.revision < revision.current) return;
    revision.current = snapshot.revision;
    setStored(snapshot.entries);
    setSettings({
      accountName: snapshot.accountName,
      openingBalance: snapshot.openingBalance,
      target: snapshot.target,
    });
    setStorageMode(snapshot.storage);
    setRequiresKey(snapshot.requiresKey);
    setNeedsKey(false);
    setUnconfigured(false);
    setReady(true);
  }

  async function load(): Promise<"ok" | "locked" | "unconfigured" | "error"> {
    try {
      let snapshot = await fetchLedger();
      const legacy = legacyLedger();
      const serverEmpty =
        snapshot.revision === 0 && snapshot.entries.length === 0 && snapshot.openingBalance === 0;
      const legacyHasData =
        legacy.entries.length > 0 ||
        legacy.settings.openingBalance > 0 ||
        legacy.settings.accountName !== DEFAULT_SETTINGS.accountName;
      if (serverEmpty && legacyHasData) {
        snapshot = await replaceLedgerRequest(
          legacy.settings.accountName,
          legacy.settings.openingBalance,
          legacy.settings.target,
          legacy.entries,
        );
      }
      apply(snapshot);
      setSyncError("");
      return "ok";
    } catch (error) {
      if (error instanceof DeskError && error.code === "locked") {
        setNeedsKey(true);
        setReady(false);
        return "locked";
      }
      if (error instanceof DeskError && error.code === "unconfigured") {
        setUnconfigured(true);
        setReady(false);
        setSyncError(error.message);
        return "unconfigured";
      }
      setSyncError(error instanceof Error ? error.message : "The shared desk could not be opened.");
      return "error";
    }
  }

  useEffect(() => {
    let cancel = false;
    void (async () => {
      if (!cancel) await load();
    })();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 10000);
    return () => {
      cancel = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
    // The loader closes over the latest revision ref and only runs for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function commit(task: () => Promise<LedgerSnapshot>) {
    setSaving(true);
    setSyncError("");
    try {
      apply(await task());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save.";
      setSyncError(message);
      if (error instanceof DeskError && error.code === "locked") setNeedsKey(true);
      try {
        apply(await fetchLedger());
      } catch {
        // Keep the error from the save. The next refresh will try again.
      }
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setSaving(false);
    }
  }

  const entries = useMemo(
    () => withBalances(stored, settings.openingBalance),
    [stored, settings.openingBalance],
  );

  const value: LedgerContextValue = {
    ready,
    saving,
    needsKey,
    unconfigured,
    syncError,
    storageMode,
    requiresKey,
    settings,
    entries,
    remaining: remainingBalance(entries, settings.openingBalance),
    unlock: async (key) => {
      saveDeskKey(key.trim());
      setSyncError("");
      const result = await load();
      if (result === "locked") throw new DeskError("That key does not open this desk.", "locked");
      if (result !== "ok") throw new DeskError("The shared desk could not be opened.");
    },
    saveSettings: (next) =>
      commit(() =>
        saveSettingsRequest(
          next.accountName.trim() || DEFAULT_SETTINGS.accountName,
          next.openingBalance,
          next.target,
        ),
      ),
    addEntry: (input) => commit(() => addEntryRequest(input)),
    updateEntry: (id, input) => commit(() => updateEntryRequest(id, input)),
    deleteEntry: (id) => commit(() => deleteEntryRequest(id)),
    replaceLedger: (file) =>
      commit(() => replaceLedgerRequest(file.accountName, file.openingBalance, file.target, file.entries)),
    clearEntries: () => commit(() => clearLedgerRequest()),
  };

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside LedgerProvider");
  return value;
}
