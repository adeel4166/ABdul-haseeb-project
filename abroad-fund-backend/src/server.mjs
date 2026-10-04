import "dotenv/config";
import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
    allowedHeaders: ["Content-Type", "Authorization", "x-desk-key"],
  }),
);

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey12345";

function snapshot(ledger) {
  return {
    ...ledger,
    storage: "mysql",
    requiresKey: false,
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

// AUTH ROUTES
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')",
      [username, hashedPassword]
    );
    res.json({ success: true, userId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username already exists" });
    res.status(500).json({ error: "Could not create user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    let valid = false;
    if (user.password === password) { 
        // Plain text fallback if created manually via SQL (e.g. Adminabdul)
        valid = true;
        // Upgrade to hashed password automatically
        const hashed = await bcrypt.hash(password, 10);
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
    } else {
        valid = await bcrypt.compare(password, user.password);
    }
    
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// MIDDLEWARE for authentication
app.use("/api", (req, res, next) => {
  if (req.path === "/auth/signup" || req.path === "/auth/login" || req.path === "/health") return next();
  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Please login.", code: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token", code: "unauthorized" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, username, role, created_at FROM users WHERE id = ?", [req.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Passwords required" });
  try {
    const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [req.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    
    let valid = false;
    if (user.password === currentPassword) {
        valid = true;
    } else {
        valid = await bcrypt.compare(currentPassword, user.password);
    }
    
    if (!valid) return res.status(401).json({ error: "Incorrect current password" });
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// ADMIN ROUTES
app.get("/api/admin/users", async (req, res) => {
  if (req.userRole !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const [users] = await pool.query("SELECT id, username, role, created_at FROM users");
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  if (req.userRole !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    // Delete user's data as well
    await pool.query("DELETE FROM entries WHERE user_id = ?", [req.params.id]);
    await pool.query("DELETE FROM settings WHERE user_id = ?", [req.params.id]);
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// LEDGER ROUTES
app.get("/api/ledger", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(snapshot(await loadLedger(req.userId)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The shared desk could not be opened.";
    res.status(500).json({ error: message });
  }
});

app.post("/api/ledger", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(snapshot(await changeLedger(req.body, req.userId)));
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
