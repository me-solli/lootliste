console.log("SERVER.JS wird geladen");

// ================================
// IMPORTS
// ================================
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const cors = require("cors");

// ================================
// DB
// ================================
const db = require("./db");

// ================================
// ROUTES
// ================================
const itemRoutes = require("./routes/items");
const adminRoutes = require("./routes/admin");

console.log("ITEM ROUTES GELADEN:", typeof itemRoutes);
console.log("ADMIN ROUTES GELADEN:", typeof adminRoutes);

// ================================
// APP
// ================================
const app = express();

// ================================
// PORT (Railway)
// ================================
const PORT = process.env.PORT || 8080;

// ================================
// CONFIG
// ================================
const USERS_FILE = path.join(__dirname, "users.json");
const SESSION_DURATION_MINUTES = 60;

// ================================
// MIDDLEWARE
// ================================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-login-id"]
  })
);

app.use(express.json());

// 👉 Uploads öffentlich erreichbar
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================================
// SESSIONS (IN-MEMORY)
// ================================
const sessions = {};

// ================================
// HELPERS
// ================================
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getSession(loginId) {
  const s = sessions[loginId];
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    delete sessions[loginId];
    return null;
  }
  return s;
}

// ================================
// AUTH MIDDLEWARE
// ================================
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];
  const session = getSession(loginId);

  if (!session) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }

  req.user = { id: session.userId };
  next();
}

// ================================
// ROOT / HEALTH
// ================================
app.get("/", (req, res) => {
  res.send("Backend läuft 👌");
});

// ================================
// AUTH ROUTES
// ================================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Fehlende Daten" });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "User existiert bereits" });
  }

  const hash = await bcrypt.hash(password, 10);
  users.push({
    id: crypto.randomUUID(),
    username,
    password: hash,
    createdAt: new Date().toISOString()
  });

  saveUsers(users);
  res.json({ success: true });
});

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
// API ROUTES
// ================================

// 🔐 ITEMS → Login Pflicht
app.use(
  "/api/items",
  (req, res, next) => {
    const loginId = req.headers["x-login-id"];
    if (loginId) {
      req.user = { id: loginId };
      return next();
    }
    return res.status(401).json({ error: "Nicht eingeloggt" });
  },
  itemRoutes
);

// 🔐 ADMIN → Login Pflicht
app.use("/api/admin", requireAuth, adminRoutes);

// ================================
// START SERVER
// ================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend läuft auf Port ${PORT}`);
});
