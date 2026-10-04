const whole = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

const paisa = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function roundRupees(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatRs(amount: number): string {
  const rounded = roundRupees(amount);
  const formatted = Number.isInteger(rounded)
    ? whole.format(Math.abs(rounded))
    : paisa.format(Math.abs(rounded));
  return rounded < 0 ? `−Rs ${formatted}` : `Rs ${formatted}`;
}

export function formatSignedRs(amount: number, type: "in" | "out"): string {
  const formatted = formatRs(amount).replace("−", "");
  return type === "in" ? `+${formatted}` : `−${formatted}`;
}

export function parseRupees(raw: string, allowZero: boolean): number | null {
  const cleaned = raw.replace(/rs/gi, "").replace(/,/g, "").replace(/\s/g, "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const amount = roundRupees(Number(cleaned));
  if (!Number.isFinite(amount)) return null;
  if (amount < 0 || (!allowZero && amount === 0)) return null;
  if (amount > 1_000_000_000_000) return null;
  return amount;
}
