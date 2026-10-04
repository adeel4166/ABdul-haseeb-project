const CATEGORY_MAX = 60;
const NEW_CATEGORY = "__new__";

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function roundRupees(amount) {
  return Math.round(amount * 100) / 100;
}

function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeCategory(raw) {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || cleaned.length > CATEGORY_MAX || cleaned === NEW_CATEGORY) return null;
  return cleaned;
}

function readNonNegative(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { ok: false, error: `${label} must be zero or more.` };
  }
  return { ok: true, amount: roundRupees(value) };
}

function parseEntryInput(value) {
  if (!isRecord(value)) return { ok: false, error: "That entry is incomplete." };
  if (value.type !== "in" && value.type !== "out") {
    return { ok: false, error: "Choose money in or money out." };
  }
  if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (typeof value.date !== "string" || !isISODate(value.date)) {
    return { ok: false, error: "Pick a real date." };
  }
  const category = typeof value.category === "string" ? normalizeCategory(value.category) : null;
  if (!category) return { ok: false, error: "Enter a category, or pick one from the list." };
  if (value.note !== undefined && typeof value.note !== "string") {
    return { ok: false, error: "The note must be text." };
  }
  return {
    ok: true,
    input: {
      type: value.type,
      amount: roundRupees(value.amount),
      date: value.date,
      category,
      note: typeof value.note === "string" ? value.note.trim() : "",
    },
  };
}

function createEntry(input) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: input.type,
    amount: input.amount,
    date: input.date,
    category: input.category,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };
}

function applyEntryUpdate(entry, input) {
  return {
    ...entry,
    type: input.type,
    amount: input.amount,
    date: input.date,
    category: input.category,
    note: input.note,
    updatedAt: new Date().toISOString(),
  };
}

function parseSettings(value) {
  if (typeof value.accountName !== "string" || value.accountName.trim().length === 0) {
    return { ok: false, error: "The account needs a name." };
  }
  if (value.accountName.trim().length > 200) {
    return { ok: false, error: "The account name is too long." };
  }
  const opening = readNonNegative(value.openingBalance, "Opening balance");
  if (!opening.ok) return opening;
  const target = readNonNegative(value.target ?? 0, "Trip target");
  if (!target.ok) return target;
  return {
    ok: true,
    accountName: value.accountName.trim(),
    openingBalance: opening.amount,
    target: target.amount,
  };
}

function parseImportedEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return { ok: false, error: "The file has no entries list." };
  const seen = new Set();
  const entries = [];
  for (let index = 0; index < rawEntries.length; index += 1) {
    const item = rawEntries[index];
    const label = `Entry ${index + 1}`;
    if (!isRecord(item)) return { ok: false, error: `${label} is not an object.` };
    const parsed = parseEntryInput(item);
    if (!parsed.ok) return { ok: false, error: `${label}: ${parsed.error}` };
    if (typeof item.note !== "string") return { ok: false, error: `${label} needs a note, even if it is blank.` };
    let id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : crypto.randomUUID();
    if (seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
    const now = new Date().toISOString();
    entries.push({
      id,
      ...parsed.input,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
    });
  }
  return { ok: true, entries };
}

export function emptyLedger() {
  return {
    revision: 0,
    accountName: "Abroad Fund",
    openingBalance: 0,
    target: 0,
    entries: [],
  };
}

export function applyLedgerOp(current, body) {
  if (!isRecord(body) || typeof body.op !== "string") {
    return { ok: false, error: "The desk did not understand that change." };
  }

  if (body.op === "add") {
    const parsed = parseEntryInput(body.input);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      ledger: { ...current, revision: current.revision + 1, entries: [...current.entries, createEntry(parsed.input)] },
    };
  }

  if (body.op === "update") {
    if (typeof body.id !== "string") return { ok: false, error: "That entry could not be found." };
    const parsed = parseEntryInput(body.input);
    if (!parsed.ok) return parsed;
    if (!current.entries.some((entry) => entry.id === body.id)) {
      return { ok: false, error: "That entry is no longer on the desk. Refresh and try again." };
    }
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        entries: current.entries.map((entry) => (entry.id === body.id ? applyEntryUpdate(entry, parsed.input) : entry)),
      },
    };
  }

  if (body.op === "delete") {
    if (typeof body.id !== "string") return { ok: false, error: "That entry could not be found." };
    if (!current.entries.some((entry) => entry.id === body.id)) {
      return { ok: false, error: "That entry is no longer on the desk. Refresh and try again." };
    }
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        entries: current.entries.filter((entry) => entry.id !== body.id),
      },
    };
  }

  if (body.op === "settings") {
    const parsed = parseSettings(body);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      ledger: {
        ...current,
        revision: current.revision + 1,
        accountName: parsed.accountName,
        openingBalance: parsed.openingBalance,
        target: parsed.target,
      },
    };
  }

  if (body.op === "replace") {
    const settings = parseSettings({
      accountName: body.accountName,
      openingBalance: body.openingBalance,
      target: body.target,
    });
    if (!settings.ok) return settings;
    const entries = parseImportedEntries(body.entries);
    if (!entries.ok) return entries;
    return {
      ok: true,
      ledger: {
        revision: current.revision + 1,
        accountName: settings.accountName,
        openingBalance: settings.openingBalance,
        target: settings.target,
        entries: entries.entries,
      },
    };
  }

  if (body.op === "clear") {
    return { ok: true, ledger: { ...current, revision: current.revision + 1, entries: [] } };
  }

  return { ok: false, error: "The desk did not understand that change." };
}
