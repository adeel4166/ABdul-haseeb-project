import mysql from "mysql2/promise";
import { applyLedgerOp, emptyLedger } from "./ledger.mjs";

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || "abroad_fund",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
  timezone: "Z",
});

function isoFromSql(value) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  if (text.endsWith("Z") || text.includes("T")) return new Date(text).toISOString();
  return new Date(`${text.replace(" ", "T")}Z`).toISOString();
}

function sqlDateTime(iso) {
  const date = new Date(iso);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return safe.toISOString().slice(0, 23).replace("T", " ");
}

function mapEntry(row) {
  return {
    id: row.id,
    type: row.type,
    amount: roundAmount(row.amount),
    date: String(row.entry_date).slice(0, 10),
    category: row.category,
    note: row.note,
    createdAt: isoFromSql(row.created_at),
    updatedAt: isoFromSql(row.updated_at),
  };
}

function roundAmount(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function readLedger(conn, lock) {
  const [settingsRows] = await conn.query(
    `SELECT revision, account_name, opening_balance, target
     FROM settings WHERE id = 1${lock ? " FOR UPDATE" : ""}`,
  );
  const settings = settingsRows[0];
  const [entryRows] = await conn.query(
    `SELECT id, type, amount, entry_date, category, note, created_at, updated_at
     FROM entries`,
  );
  if (!settings) return emptyLedger();
  return {
    revision: Number(settings.revision) || 0,
    accountName: settings.account_name,
    openingBalance: roundAmount(settings.opening_balance),
    target: roundAmount(settings.target),
    entries: entryRows.map(mapEntry),
  };
}

async function writeLedger(conn, ledger) {
  await conn.query(
    `UPDATE settings
     SET revision = ?, account_name = ?, opening_balance = ?, target = ?
     WHERE id = 1`,
    [ledger.revision, ledger.accountName, ledger.openingBalance, ledger.target],
  );
  await conn.query("DELETE FROM entries");
  if (ledger.entries.length === 0) return;
  await conn.query(
    `INSERT INTO entries (id, type, amount, entry_date, category, note, created_at, updated_at) VALUES ?`,
    [
      ledger.entries.map((entry) => [
        entry.id,
        entry.type,
        entry.amount,
        entry.date,
        entry.category,
        entry.note,
        sqlDateTime(entry.createdAt),
        sqlDateTime(entry.updatedAt),
      ]),
    ],
  );
}

export async function loadLedger() {
  const conn = await pool.getConnection();
  try {
    return await readLedger(conn, false);
  } finally {
    conn.release();
  }
}

export async function changeLedger(body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const current = await readLedger(conn, true);
    const result = applyLedgerOp(current, body);
    if (!result.ok) {
      await conn.rollback();
      const error = new Error(result.error);
      error.status = 400;
      throw error;
    }
    await writeLedger(conn, result.ledger);
    await conn.commit();
    return result.ledger;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // The original error is the one to report.
    }
    throw error;
  } finally {
    conn.release();
  }
}
