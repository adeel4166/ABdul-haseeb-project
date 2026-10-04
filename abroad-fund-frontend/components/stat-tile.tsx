import { cn } from "cn";

export function StatTile({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "plain" | "in" | "out";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-brass/35 bg-white/45 px-3 py-3">
      <p className="text-[11px] tracking-wide break-words text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-lg tabular-nums break-words sm:text-xl",
          tone === "in" && "text-money-in",
          tone === "out" && "text-money-out",
          tone === "plain" && "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
