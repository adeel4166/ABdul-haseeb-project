"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLedger } from "@/lib/ledger-context";

export function DeskKeyScreen() {
  const { unlock } = useLedger();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await unlock(key);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That key does not open this desk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-3">
      <h2 className="font-heading text-3xl text-ink">Desk key</h2>
      <p className="text-sm text-muted-foreground">
        This desk is shared by your phone and laptop, and it is locked. Enter the same key on every device. It is the
        LEDGER_KEY on the VPS, not a bank password.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="desk-key">Key</Label>
        <Input
          id="desk-key"
          className="h-10"
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-money-out" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-fit" disabled={busy || key.trim().length === 0}>
        {busy ? "Opening…" : "Open desk"}
      </Button>
    </form>
  );
}
