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
// USER SYSTEM (GAST / ACCOUNT)
// ===============================
function createUser() {
  const id = "usr_" + crypto.randomBytes(6).toString("hex");
  const user = {
    id,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveJSON(USERS_FILE, users);
  return user;
}

// 🔐 Zentrale User-Middleware (FINAL)
app.use((req, res, next) => {
  const headerId = req.headers["x-user-id"];
  let user = null;

  // 1️⃣ existiert als Gast
  if (headerId) {
    user = users.find(u => u.id === headerId);
  }

  // 2️⃣ existiert als registrierter Account
  if (!user && headerId) {
    const acc = accounts.find(a => a.userId === headerId);
    if (acc) {
      user = { id: headerId };
    }
  }

  // 3️⃣ sonst: neuer Gast
  if (!user) {
    user = createUser();
  }

  req.user = user;
  res.setHeader("X-User-Id", user.id);
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

function findAccountByUserId(userId) {
  return accounts.find(a => a.userId === userId);
}

// ===============================
// AUTH – REGISTER
// ===============================
app.post("/auth/register", async (req, res) => {
  const { username, password, userId } = req.body;

  if (!username || !password || !userId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (findAccountByUsername(username)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  if (findAccountByUserId(userId)) {
    return res.status(409).json({ error: "Account already exists for this user" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const account = {
    userId,
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  accounts.push(account);
  saveAccounts();

  res.json({ userId, username });
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

  res.json({
    userId: account.userId,
    username: account.username
  });
});

// ===============================
// ME
// ===============================
app.get("/me", (req, res) => {
  const userId = req.user.id;
  const account = findAccountByUserId(userId);

  if (!account) {
    return res.json({ userId });
  }

  res.json({
    userId: account.userId,
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
// POST ITEM (FINAL)
// ===============================
app.post("/items", (req, res) => {
  const { name, quality, type, screenshot, season } = req.body;

  if (!name || !quality || !type || !screenshot || !season) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // 🔑 Spender eindeutig aus Account holen
  const account = findAccountByUserId(req.user.id);

  const newItem = {
    id: Date.now(),
    name,
    quality,
    type,
    screenshot,
    season,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    // 🔒 FINAL: Spender kommt IMMER vom Account
    donorUserId: req.user.id,
    donor: account ? account.username : null,

    claimedByUserId: null,
    contact: null,
    claimedAt: null,

    handover: {
      donorConfirmed: false,
      receiverConfirmed: false,
      donorConfirmedAt: null,
      receiverConfirmedAt: null
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
