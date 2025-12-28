console.log("SERVER.JS (root) wird geladen");

// ================================
// ===== IMPORTS =====
// ================================
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// ================================
// ===== DB =====
// ================================
const db = require("./db");

// ================================
// ===== ROUTES =====
// ================================
const itemRoutes = require("./routes/items");
console.log("ITEM ROUTES GELADEN:", typeof itemRoutes);

// ================================
// ===== APP =====
// ================================
const app = express();

// ================================
// ===== PORT (RAILWAY) =====
// ================================
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ PORT ist nicht gesetzt");
  process.exit(1);
}

// ================================
// ===== KONFIG =====
// ================================
const SESSION_DURATION_MINUTES = 60;
const USERS_FILE = path.join(__dirname, "users.json");

// ================================
// ===== MIDDLEWARE =====
// ================================
app.use(express.json());

// ================================
// ===== IN-MEMORY SESSIONS =====
// ================================
const sessions = {};

// ================================
// ===== HELPER =====
// ================================
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getSession(loginId) {
  if (!loginId) return null;
  const session = sessions[loginId];
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    delete sessions[loginId];
    return null;
  }
  return session;
}

// ================================
// ===== AUTH MIDDLEWARE =====
// ================================
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];
  const session = getSession(loginId);

  if (!session) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }

  req.session = session;
  req.user = { id: session.userId };
  next();
}

// ================================
// ===== HEALTH =====
// ================================
app.get("/", (req, res) => {
  res.send("Backend läuft 👌");
});

// ================================
// ===== REGISTER =====
// ================================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username & Passwort nötig" });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Username existiert bereits" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: crypto.randomUUID(),
    username,
    password: hashed,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);

  res.json({ success: true });
});

// ================================
// ===== LOGIN =====
// ================================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "User nicht gefunden" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Passwort falsch" });
  }

  const loginId = crypto.randomUUID();
  sessions[loginId] = {
    userId: user.id,
    expiresAt: Date.now() + SESSION_DURATION_MINUTES * 60 * 1000
  };

  res.json({ loginId });
});

// ================================
// ===== API ROUTES =====
// ================================
app.use("/api/items", requireAuth, itemRoutes);

// ================================
// ===== START =====
// ================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend läuft auf Port ${PORT}`);
});
