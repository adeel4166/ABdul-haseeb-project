"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayISO } from "@/lib/dates";
import { downloadJson, downloadText, entriesToCsv } from "@/lib/export";
import { parseLedgerFile, toLedgerFile } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import { useRouter } from "next/navigation";
import { parseRupees } from "@/lib/money";
import type { LedgerFile } from "@/lib/types";

export function SetupScreen() {
  const router = useRouter();
  const { settings, entries, storageMode, requiresKey, saveSettings, replaceLedger, clearEntries } = useLedger();
  const [name, setName] = useState(settings.accountName);
  const [opening, setOpening] = useState(String(settings.openingBalance));
  const [target, setTarget] = useState(String(settings.target));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<LedgerFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveAccount() {
    const parsed = parseRupees(opening, true);
    if (parsed === null) {
      setError("Opening balance must be zero or more.");
      setMessage("");
      return;
    }
    const parsedTarget = parseRupees(target, true);
    if (parsedTarget === null) {
      setError("Trip target must be zero or more.");
      setMessage("");
      return;
    }
    const accountName = name.trim() || "Abroad Fund";
    setName(accountName);
    setOpening(String(parsed));
    setTarget(String(parsedTarget));
    try {
      await saveSettings({ accountName, openingBalance: parsed, target: parsedTarget });
      setError("");
      setMessage("Saved on the shared desk. Phone and laptop will show the same opening balance and target.");
      router.push("/");
    } catch (caught) {
      setMessage("");
      setError(caught instanceof Error ? caught.message : "Could not save.");
    }
  }

  function exportJson() {
    const stamp = todayISO();
    downloadJson(
      `abroad-fund-${stamp}.json`,
      toLedgerFile(settings.accountName, settings.openingBalance, settings.target, entries),
    );
  }

  function exportCsv() {
    downloadText(`abroad-fund-${todayISO()}.csv`, entriesToCsv(entries), "text/csv;charset=utf-8");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setMessage("");
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text()) as unknown;
    } catch {
      setError("That file is not valid JSON.");
      return;
    }
    const parsed = parseLedgerFile(raw);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (entries.length > 0) {
      setPendingFile(parsed.file);
      return;
    }
    try {
      await replaceLedger(parsed.file);
      setName(parsed.file.accountName);
      setOpening(String(parsed.file.openingBalance));
      setTarget(String(parsed.file.target));
      setMessage(`Imported ${parsed.file.entries.length} entries for ${parsed.file.accountName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-ink sm:text-3xl">Setup</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Manage your account settings, opening balance, and target amount. Export or import your data as needed.
        </p>
      </div>

      <section className="grid max-w-md gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="account-name">Account name</Label>
          <Input id="account-name" className="h-10" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="opening-balance">Opening balance (Rs)</Label>
          <Input
            id="opening-balance"
            className="h-10"
            inputMode="decimal"
            value={opening}
            onChange={(event) => setOpening(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Money already in the bank when you start. It is not an entry. Remaining = this amount + money in − money
            out. You can change it later.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="trip-target">Target (Rs)</Label>
          <Input
            id="trip-target"
            className="h-10"
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            How much you want in this account before you go. 30 lakh is 3000000. Changing the target does not change
            the opening balance. Leave 0 if you do not want a target yet.
          </p>
        </div>
        <Button type="button" className="h-10 w-fit" onClick={saveAccount}>
          Save account
        </Button>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-10" onClick={exportJson}>
          Export JSON
        </Button>
        <Button type="button" variant="outline" className="h-10" onClick={exportCsv}>
          Export CSV
        </Button>
        <Button type="button" variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
          Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
        <Button type="button" variant="destructive" className="h-10" onClick={() => setClearOpen(true)}>
          Clear ledger
        </Button>
      </section>

      {message ? <p className="text-sm text-money-in">{message}</p> : null}
      {error ? (
        <p className="text-sm text-money-out" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={clearOpen}
        title="Clear the ledger?"
        description="This removes every entry from the shared desk, on this phone and every other device. The account name, opening balance, and trip target stay. Export JSON first if you want the entries back."
        confirmLabel="Clear entries"
        onOpenChange={setClearOpen}
        onConfirm={() => {
          void clearEntries()
            .then(() => {
              setClearOpen(false);
              setMessage("Ledger cleared on every device.");
              setError("");
            })
            .catch((caught: unknown) => {
              setClearOpen(false);
              setError(caught instanceof Error ? caught.message : "Could not clear the ledger.");
            });
        }}
      />

      <ConfirmDialog
        open={pendingFile !== null}
        title="Replace this desk?"
        description={
          pendingFile
            ? `Import replaces your current entries with ${pendingFile.entries.length} entries for “${pendingFile.accountName}”.`
            : ""
        }
        confirmLabel="Import"
        destructive={false}
        onOpenChange={(open) => {
          if (!open) setPendingFile(null);
        }}
        onConfirm={() => {
          if (!pendingFile) return;
          const file = pendingFile;
          void replaceLedger(file)
            .then(() => {
              setName(file.accountName);
              setOpening(String(file.openingBalance));
              setTarget(String(file.target));
              setMessage(`Imported ${file.entries.length} entries for ${file.accountName}.`);
              setPendingFile(null);
            })
            .catch((caught: unknown) => {
              setPendingFile(null);
              setError(caught instanceof Error ? caught.message : "Could not import.");
            });
        }}
      />
    </div>
  );
}
