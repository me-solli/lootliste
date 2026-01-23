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
// DATA PATH
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
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-User-Id, X-Account-Id"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// ===============================
// HELPERS
// ===============================
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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
  const device = {
    id: "usr_" + crypto.randomBytes(6).toString("hex"),
    createdAt: new Date().toISOString()
  };
  users.push(device);
  saveJSON(USERS_FILE, users);
  return device;
}

app.use((req, res, next) => {
  const headerId = req.headers["x-user-id"];
  let device = users.find(u => u.id === headerId);

  if (!device) device = createDevice();

  req.device = device;
  res.setHeader("X-User-Id", device.id);
  next();
});

// ===============================
// ACCOUNT HELPERS
// ===============================
const saveAccounts = () => saveJSON(ACCOUNTS_FILE, accounts);
const findAccountByUsername = u => accounts.find(a => a.username === u);
const findAccountById = id => accounts.find(a => a.id === id);

// ===============================
// AUTH – REGISTER
// ===============================
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  if (findAccountByUsername(username))
    return res.status(409).json({ error: "Username already exists" });

  const account = {
    id: "acc_" + crypto.randomBytes(6).toString("hex"),
    username,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  accounts.push(account);
  saveAccounts();

  res.json({ accountId: account.id, username: account.username });
});

// ===============================
// AUTH – LOGIN
// ===============================
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const account = findAccountByUsername(username);

  if (!account || !(await bcrypt.compare(password, account.passwordHash)))
    return res.status(401).json({ error: "Invalid credentials" });

  account.lastLoginAt = new Date().toISOString();
  saveAccounts();

  res.json({ accountId: account.id, username: account.username });
});

// ===============================
// ME
// ===============================
app.get("/me", (req, res) => {
  const account = findAccountById(req.headers["x-account-id"]);
  if (!account) return res.json({ deviceId: req.device.id });

  res.json({ accountId: account.id, username: account.username });
});

// ===============================
// ADMIN – GET ALL ACCOUNTS ✅
// ===============================
app.get("/admin/accounts", (req, res) => {
  res.json(
    accounts.map(acc => ({
      id: acc.id,
      username: acc.username,
      createdAt: acc.createdAt,
      lastLoginAt: acc.lastLoginAt
    }))
  );
});

// ===============================
// ADMIN – USER STATS (OPTIONAL)
// ===============================
app.get("/admin/stats", (req, res) => {
  const stats = accounts.map(acc => {
    const donated = items.filter(i => i.donorAccountId === acc.id).length;
    const received = items.filter(i => i.claimedByAccountId === acc.id).length;

    return {
      accountId: acc.id,
      username: acc.username,
      itemsDonated: donated,
      itemsReceived: received
    };
  });

  res.json(stats);
});

// ===============================
// ITEMS
// ===============================
app.get("/items", (req, res) => res.json(items));

app.post("/items", (req, res) => {
  const { name, quality, type, screenshot, season } = req.body;
  const account = findAccountById(req.headers["x-account-id"]);

  if (!name || !quality || !type || !screenshot || !season)
    return res.status(400).json({ error: "Missing fields" });

  const item = {
    id: Date.now(),
    name,
    quality,
    type,
    screenshot,
    season,
    status: "verfügbar",
    createdAt: new Date().toISOString(),
    donorAccountId: account?.id || null,
    donor: account?.username || null,
    claimedByAccountId: null,
    contact: null,
    claimedAt: null,
    handover: { donorConfirmed: false, receiverConfirmed: false }
  };

  items.push(item);
  saveJSON(ITEMS_FILE, items);
  res.status(201).json(item);
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () =>
  console.log("Backend läuft auf Port", PORT)
);
