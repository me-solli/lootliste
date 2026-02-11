// ===============================
// IMPORTS
// ===============================
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { registerVisit, getVisitCount } from "./visitor.js";

// ===============================
// APP SETUP
// ===============================
const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_USERNAME = "me_solli";

// ===============================
// DATA PATH (Railway Volume)
// ===============================
const DATA_DIR = "/data";
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// ===============================
// MIDDLEWARE (CORS)
// ===============================
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://me-solli.github.io",
    "https://d2r-lootliste.de"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-User-Id, X-Account-Id, X-Admin-Token"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-User-Id"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// ===============================
// HELPERS
// ===============================
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===============================
// INIT DATA
// ===============================
ensureDataDir();
let items = loadJSON(ITEMS_FILE, []);
let users = loadJSON(USERS_FILE, []);
let accounts = loadJSON(ACCOUNTS_FILE, []);
let feedback = loadJSON(FEEDBACK_FILE, []);
let sessions = loadJSON(SESSIONS_FILE, []);

// ===============================
// DEVICE (GAST) SYSTEM
// ===============================
function createDevice() {
  const id = "usr_" + crypto.randomBytes(6).toString("hex");
  const device = {
    id,
    createdAt: new Date().toISOString(),
    lastRegisterAt: 0, // Registrierungs-Cooldown
    lastVisitAt: 0     // 👁️ Besucher-Cooldown (1 Count / 24h)
  };
  users.push(device);
  saveJSON(USERS_FILE, users);
  return device;
}

// ===============================
// DEVICE MIDDLEWARE
// ===============================
app.use((req, res, next) => {
  const headerId = req.headers["x-user-id"];
  let device = null;

  if (headerId) {
    device = users.find(u => u.id === headerId);
  }

  if (!device) {
    device = createDevice();
  }

  // Fallback für alte Devices
  let changed = false;

  if (device.lastRegisterAt === undefined) {
    device.lastRegisterAt = 0;
    changed = true;
  }

  if (device.lastVisitAt === undefined) {
    device.lastVisitAt = 0;
    changed = true;
  }

  if (changed) {
    saveJSON(USERS_FILE, users);
  }

  req.device = device;
  res.setHeader("X-User-Id", device.id);
  next();
});

// ===============================
// ACCOUNT HELPERS
// ===============================
function saveAccounts() {
  saveJSON(ACCOUNTS_FILE, accounts);
}

function findAccountByUsername(username) {
  return accounts.find(a => a.username === username);
}

function findAccountById(accountId) {
  return accounts.find(a => a.id === accountId);
}

function isAdmin(account) {
  return account && account.username === ADMIN_USERNAME;
}

function findAccountByEmail(email) {
  return accounts.find(a => a.email === email);
}

function findAccountByBattletag(battletag) {
  return accounts.find(a => a.battletag === battletag);
}

function isValidBattletag(tag) {
  const regex = /^[A-Za-z0-9]{3,12}#[0-9]{4}$/;
  return regex.test(tag);
}

// ===============================
// SESSION HELPERS (NEU – PHASE 1)
// ===============================
function saveSessions() {
  saveJSON(SESSIONS_FILE, sessions);
}

function createSession(accountId) {
  const token = crypto.randomBytes(24).toString("hex");

  const session = {
    token,
    accountId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 Tage
  };

  sessions.push(session);
  saveSessions();

  return token;
}

function getAccountFromSession(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return null;

  const token = match[1];
  const session = sessions.find(s => s.token === token);

  if (!session) return null;
  if (Date.now() > session.expiresAt) return null;

  return findAccountById(session.accountId);
}

// ===============================
// MINIMAL COOLDOWN (60s)
// ===============================
function checkCooldown(account, seconds = 60) {
  const now = Date.now();

  if (account.lastActionAt && now - account.lastActionAt < seconds * 1000) {
    return false;
  }

  account.lastActionAt = now;
  saveAccounts();
  return true;
}

// ===============================
// AUTH – REGISTER (1 PRO STUNDE / DEVICE)
// ===============================
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const device = req.device;
  const now = Date.now();

  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // 🧱 DEVICE-REGISTRIERUNGS-BREMSE (1 / Stunde)
  if (device.lastRegisterAt && now - device.lastRegisterAt < 60 * 60 * 1000) {
    return res.status(429).json({
      error: "Bitte warte etwas, bevor du einen weiteren Account erstellst."
    });
  }

  if (findAccountByUsername(username)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const account = {
    id: "acc_" + crypto.randomBytes(6).toString("hex"),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    lastActionAt: 0
  };

  accounts.push(account);
  saveAccounts();

  // ⬅️ Registrierung für dieses Device merken
  device.lastRegisterAt = now;
  saveJSON(USERS_FILE, users);

  res.json({
    accountId: account.id,
    username: account.username
  });
});

// ===============================
// AUTH – LOGIN
// ===============================
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const account = findAccountByUsername(username);
  if (!account) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, account.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  account.lastLoginAt = new Date().toISOString();
  saveAccounts();

  // 🆕 Session erstellen
  const token = createSession(account.id);

  // 🆕 Cookie setzen (parallel zum alten System)
  res.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; Path=/; Max-Age=${7*24*60*60}; SameSite=Lax`
  );

  // 🔁 Alte Antwort bleibt bestehen (Fallback aktiv)
  res.json({
    accountId: account.id,
    username: account.username
  });
});

// ===============================
// ME
// ===============================
app.get("/me", (req, res) => {
  const accountId = req.headers["x-account-id"];
  const account = accountId ? findAccountById(accountId) : null;

  if (!account) {
    return res.json({
      deviceId: req.device.id
    });
  }

  res.json({
    accountId: account.id,
    username: account.username
  });
});

// ===============================
// HEALTHCHECK
// ===============================
app.get("/", (req, res) => {
  res.send("Lootliste Backend OK");
});

// ===============================
// VISITOR COUNTER (1 / DEVICE / 24h)
// ===============================
app.post("/visit", (req, res) => {
  const device = req.device;
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  let counted = false;

  // ✅ zählen, wenn erstes Mal oder >24h her
  if (!device.lastVisitAt || now - device.lastVisitAt >= DAY) {
    const count = registerVisit();
    device.lastVisitAt = now;
    saveJSON(USERS_FILE, users);
    counted = true;
    return res.json({ count, counted });
  }

  // ❌ sonst nicht zählen → nur aktuellen Stand zurückgeben
  return res.json({
    count: getVisitCount(),
    counted
  });
});

// ===============================
// ADMIN – GET ALL ACCOUNTS
// ===============================
app.get("/admin/accounts", (req, res) => {
  res.json(
    accounts.map(a => ({
      id: a.id,
      username: a.username,
      createdAt: a.createdAt,
      lastLoginAt: a.lastLoginAt
    }))
  );
});

// ===============================
// GET ITEMS
// ===============================
app.get("/items", (req, res) => {
  res.json(items);
});

// ===============================
// GET LATEST ITEMS (FOR OBS)
// ===============================
app.get("/api/items/latest", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const latestItems = [...items]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map(i => ({
      id: i.id,
      name: i.name,
      quality: i.quality,
      type: i.type,
      status: i.status,
      contact: i.contact,
      donor: i.donor,
      createdAt: i.createdAt
    }));

  res.json(latestItems);
});

// ===============================
// POST ITEM (MIT 60s COOLDOWN)
// ===============================
app.post("/items", (req, res) => {
  const { name, quality, type, screenshot, season, note_private } = req.body;
  const accountId = req.headers["x-account-id"];

  if (!name || !quality || !type || !screenshot || !season) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const account = accountId ? findAccountById(accountId) : null;

  if (account && !checkCooldown(account, 60)) {
    return res.status(429).json({
      error: "Bitte warte kurz, bevor du ein weiteres Item einreichst."
    });
  }

  const newItem = {
    id: Date.now(),
    name,
    quality,
    type,
    screenshot,
    season,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    donorAccountId: account ? account.id : null,
    donor: account ? account.username : null,

    note_private: note_private || "",

    claimedByAccountId: null,
    contact: null,
    claimedAt: null,

    handover: {
      donorConfirmed: false,
      receiverConfirmed: false
    }
  };

  items.push(newItem);
  saveJSON(ITEMS_FILE, items);

  res.status(201).json(newItem);
});


// ===============================
// PATCH ITEM (PRIVATE NOTE ONLY)
// ===============================
app.patch("/items/:id", (req, res) => {
  const accountId = req.headers["x-account-id"];
  const { note_private } = req.body;
  const itemId = Number(req.params.id);

  const account = accountId ? findAccountById(accountId) : null;
  if (!account) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const item = items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  // 🔒 nur der Einreicher darf die interne Notiz ändern
  if (item.donorAccountId !== account.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  item.note_private = (note_private || "").slice(0, 50);

  saveJSON(ITEMS_FILE, items);
  res.json({ ok: true });
});


// ===============================
// CLAIM ITEM (MIT 60s COOLDOWN)
// ===============================
app.post("/items/:id/claim", (req, res) => {
  const accountId = req.headers["x-account-id"];
  const itemId = Number(req.params.id);
  const { contact } = req.body;

  if (!accountId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const account = findAccountById(accountId);
  if (!account) {
    return res.status(401).json({ error: "Account not found" });
  }

  if (!checkCooldown(account, 60)) {
    return res.status(429).json({
      error: "Bitte warte kurz, bevor du ein weiteres Item claimst."
    });
  }

  const item = items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (item.donorAccountId === accountId) {
    return res.status(400).json({ error: "Cannot claim own item" });
  }

  if (item.status !== "verfügbar") {
    return res.status(400).json({ error: "Item not available" });
  }

  item.status = "reserviert";
  item.claimedByAccountId = accountId;
  item.claimedAt = new Date().toISOString();
  item.contact = contact || null;

  saveJSON(ITEMS_FILE, items);
  res.json(item);
});

// ===============================
// CONFIRM HANDOVER (FINAL & ROBUST)
// ===============================
app.post("/items/:id/confirm-donor", (req, res) => {
  const acc = findAccountById(req.headers["x-account-id"]);
  const item = items.find(i => i.id == req.params.id);

  if (!item || item.donorAccountId !== acc?.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!item.handover) {
    item.handover = { donorConfirmed: false, receiverConfirmed: false };
  }

  item.handover.donorConfirmed = true;
  finalizeItem(item);

  saveJSON(ITEMS_FILE, items);
  res.json(item);
});

app.post("/items/:id/confirm-receiver", (req, res) => {
  const acc = findAccountById(req.headers["x-account-id"]);
  const item = items.find(i => i.id == req.params.id);

  if (!item || item.claimedByAccountId !== acc?.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!item.handover) {
    item.handover = { donorConfirmed: false, receiverConfirmed: false };
  }

  item.handover.receiverConfirmed = true;
  finalizeItem(item);

  saveJSON(ITEMS_FILE, items);
  res.json(item);
});

function finalizeItem(item) {
  if (!item.handover) return;

  if (
    item.status === "reserviert" &&
    item.handover.donorConfirmed === true &&
    item.handover.receiverConfirmed === true
  ) {
    item.status = "vergeben";
    item.completedAt = new Date().toISOString();
  }
}

// ===============================
// DELETE ITEM (OWNER ODER ADMIN)
// ===============================
app.delete("/items/:id", (req, res) => {
  const acc = findAccountById(req.headers["x-account-id"]);
  const index = items.findIndex(i => i.id == req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (items[index].donorAccountId !== acc?.id && !isAdmin(acc)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  items.splice(index, 1);
  saveJSON(ITEMS_FILE, items);
  res.json({ success: true });
});

// ===============================
// FEEDBACK (MINIMAL, READ-ONLY)
// ===============================
app.post("/feedback", (req, res) => {
  try {
    const text = (req.body.description || "").trim();
    if (text.length < 10) {
      return res.status(400).json({ error: "Feedback too short" });
    }

    const entry = {
      id: Date.now(),
      text,
      page: req.body.page || null,
      createdAt: new Date().toISOString()
    };

    feedback.push(entry);
    saveJSON(FEEDBACK_FILE, feedback);

    res.json({ ok: true });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: "failed" });
  }
});

// ===============================
// ADMIN: FEEDBACK READ-ONLY
// ===============================
app.get("/admin/feedback", (req, res) => {
  const adminToken = req.headers["x-admin-token"];

  if (adminToken !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    res.json([...feedback].reverse()); // neuestes zuerst
  } catch (err) {
    console.error("admin feedback error", err);
    res.status(500).json({ error: "failed" });
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
