// ===============================
// IMPORTS
// ===============================
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";

// ===============================
// APP SETUP
// ===============================
const app = express();
const PORT = process.env.PORT || 8080;

// ===============================
// DATA PATH (Railway Volume)
// ===============================
const DATA_DIR = "/data";
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

// ===============================
// MIDDLEWARE (CORS)
// ===============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id");

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

// ===============================
// DEVICE (GAST) SYSTEM
// ===============================
function createDevice() {
  const id = "usr_" + crypto.randomBytes(6).toString("hex");
  const device = {
    id,
    createdAt: new Date().toISOString()
  };
  users.push(device);
  saveJSON(USERS_FILE, users);
  return device;
}

// ===============================
// DEVICE MIDDLEWARE (STABIL)
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

// ===============================
// AUTH – REGISTER (ACCOUNT)
// ===============================
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
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
    lastLoginAt: new Date().toISOString()
  };

  accounts.push(account);
  saveAccounts();

  res.json({
    accountId: account.id,
    username: account.username
  });
});

// ===============================
// AUTH – LOGIN (MULTI DEVICE)
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
// GET ITEMS
// ===============================
app.get("/items", (req, res) => {
  res.json(items);
});

// ===============================
// POST ITEM (ACCOUNT-BASIERT)
// ===============================
app.post("/items", (req, res) => {
  const { name, quality, type, screenshot, season } = req.body;
  const accountId = req.headers["x-account-id"];

  if (!name || !quality || !type || !screenshot || !season) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const account = accountId ? findAccountById(accountId) : null;

  const newItem = {
    id: Date.now(),
    name,
    quality,
    type,
    screenshot,
    season,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    // ✅ MULTI DEVICE – Items gehören dem ACCOUNT
    donorAccountId: account ? account.id : null,
    donor: account ? account.username : null,

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
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
