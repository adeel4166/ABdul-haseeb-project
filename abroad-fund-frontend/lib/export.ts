import type { EntryWithBalance, LedgerFile } from "@/lib/types";

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function entriesToCsv(entries: EntryWithBalance[]): string {
  const header = ["Date", "Type", "Category", "Amount (PKR)", "Note", "Balance after (PKR)"];
  const rows = entries.map((entry) => [
    entry.date,
    entry.type,
    entry.category,
    entry.amount.toFixed(2),
    entry.note,
    entry.balanceAfter.toFixed(2),
  ]);
  const body = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${body}`;
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, file: LedgerFile) {
  downloadText(filename, JSON.stringify(file, null, 2), "application/json");
}
