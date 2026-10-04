import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import cors from "cors";
import express from "express";
import { changeLedger, loadLedger, pool } from "./db.mjs";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

const origins = (process.env.CORS_ORIGIN || "http://localhost:3847")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.includes("*") || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("This site is not allowed to use the desk API."));
    },
    allowedHeaders: ["Content-Type", "x-desk-key"],
  }),
);

function keyMatches(header) {
  const expected = process.env.LEDGER_KEY || "";
  if (!expected) return true;
  const given = header || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function snapshot(ledger) {
  return {
    ...ledger,
    storage: "mysql",
    requiresKey: Boolean(process.env.LEDGER_KEY),
  };
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: "MySQL is not connected." });
  }
});

app.use("/api/ledger", (req, res, next) => {
  if (!keyMatches(req.get("x-desk-key"))) {
    res.status(401).json({ error: "This desk is locked.", code: "locked" });
    return;
  }
  next();
});

app.get("/api/ledger", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(snapshot(await loadLedger()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The shared desk could not be opened.";
    res.status(500).json({ error: message });
  }
});

app.post("/api/ledger", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(snapshot(await changeLedger(req.body)));
  } catch (error) {
    const status = error && typeof error.status === "number" ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not save.";
    res.status(status).json({ error: message });
  }
});

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const message = error instanceof Error ? error.message : "Request blocked.";
  res.status(403).json({ error: message });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Abroad Fund API listening on ${port}`);
});
