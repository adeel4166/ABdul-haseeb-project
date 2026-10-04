"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  NotebookText,
  Settings,
  SunMedium,
  User,
} from "lucide-react";
import { AddEntryProvider } from "@/components/add-entry";
import { AuthScreen } from "@/components/auth-screen";
import { EntryDialog } from "@/components/entry-dialog";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/lib/ledger-context";
import { formatRs } from "@/lib/money";
import { cn } from "cn";

const dock = [
  { href: "/", label: "Desk", icon: LayoutDashboard },
  { href: "/ledger", label: "Ledger", icon: NotebookText },
  { href: "/today", label: "Today", icon: SunMedium },
  { href: "/month", label: "Month", icon: CalendarDays },
  { href: "/year", label: "Year", icon: CalendarRange },
  { href: "/setup", label: "Setup", icon: Settings },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, saving, needsKey, unconfigured, syncError, settings, remaining, addEntry } = useLedger();
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);

  function openAdd() {
    setAddKey((key) => key + 1);
    setAddOpen(true);
  }

  return (
    <AddEntryProvider openAdd={openAdd}>
      <div className="wallpaper h-dvh w-full max-w-full overflow-hidden p-1.5 sm:p-5 lg:p-8">
        <div className="paper-window mx-auto flex h-full w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-xl sm:rounded-2xl">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-brass/40 px-3 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.18em] text-brass-deep uppercase">Abroad Fund</p>
              <h1 className="truncate font-heading text-lg text-ink sm:text-2xl">
                {ready ? settings.accountName : "Abroad Fund"}
              </h1>
              <p
                className={cn(
                  "text-sm font-medium tabular-nums",
                  !ready || remaining === 0
                    ? "text-ink"
                    : remaining < 0
                      ? "text-money-out"
                      : "text-money-in",
                )}
              >
                {saving ? "Saving…" : ready ? `${formatRs(remaining)} left` : "Opening the desk…"}
              </p>
            </div>
            <Button type="button" className="h-10 shrink-0 px-3 sm:px-4" onClick={openAdd} disabled={!ready || saving}>
              Add entry
            </Button>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
            {syncError && !needsKey && !unconfigured ? (
              <p className="mb-4 rounded-lg border border-money-out/30 bg-white/50 px-3 py-2 text-sm text-money-out" role="alert">
                {syncError}
              </p>
            ) : null}
            {needsKey ? (
              <AuthScreen onLogin={(isNewUser) => {
                if (isNewUser) {
                  window.location.href = "/setup";
                } else {
                  window.location.href = "/";
                }
              }} />
            ) : unconfigured ? (
              <div className="mx-auto max-w-md space-y-3">
                <h2 className="font-heading text-3xl text-ink">Connect the shared desk</h2>
                <p className="text-sm text-muted-foreground">
                  This site does not know where the API is. On Vercel, set NEXT_PUBLIC_API_URL to the VPS address,
                  for example http://YOUR_SERVER:4000, then redeploy.
                </p>
              </div>
            ) : ready ? (
              children
            ) : (
              <p className="text-sm text-muted-foreground">Opening the desk…</p>
            )}
          </main>
          <nav
            className="grid shrink-0 grid-cols-7 border-t border-brass/40 bg-[#efe6d4] pb-[env(safe-area-inset-bottom)]"
            aria-label="Desk sections"
          >
            {dock.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] font-medium sm:gap-1 sm:px-1 sm:py-2.5 sm:text-xs",
                    active ? "text-brass-deep" : "text-muted-foreground hover:text-ink",
                  )}
                >
                  <Icon className="size-4 sm:size-[18px]" aria-hidden />
                  <span className="max-w-full truncate">{item.label}</span>
                  <span className={cn("h-0.5 w-5 rounded-full", active ? "bg-brass" : "bg-transparent")} />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <EntryDialog
        key={addKey}
        open={addOpen}
        title="Add entry"
        description="Type the money yourself. The remaining balance updates as soon as you save."
        remaining={remaining}
        onOpenChange={setAddOpen}
        onSubmit={addEntry}
      />
    </AddEntryProvider>
  );
}
