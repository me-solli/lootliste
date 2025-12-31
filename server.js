console.log("SERVER.JS wird geladen");

/* ================================
   IMPORTS
================================ */
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

const db = require("./db");

/* ================================
   APP
================================ */
const app = express();
const PORT = process.env.PORT || 3000;

/* ================================
   CORS (GitHub Pages → Railway)
================================ */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://me-solli.github.io");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-login-id"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* ================================
   BODY PARSER
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================================
   STATIC FILES
================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(__dirname));

/* ================================
   USER / SESSION HELPERS
================================ */
const USERS_FILE = path.join(__dirname, "users.json");
const sessions = new Map();

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function createSession(userId) {
  const loginId = crypto.randomUUID();
  sessions.set(loginId, {
    userId,
    createdAt: Date.now()
  });
  return loginId;
}

function getSession(loginId) {
  if (!loginId) return null;
  return sessions.get(loginId);
}

/* ================================
   AUTH MIDDLEWARE
================================ */
function requireAuth(req, res, next) {
  const loginId =
    req.headers["x-login-id"] ||
    req.cookies.loginId;

  const session = getSession(loginId);

  if (!session) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(401).json({ error: "User nicht gefunden" });
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role || "user"
  };

  next();
}

/* ================================
   LOGIN
================================ */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "User nicht gefunden" });
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Passwort falsch" });
  }

  const loginId = createSession(user.id);

  res.cookie("loginId", loginId, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24
  });

  res.json({
    success: true,
    loginId,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

/* ================================
   ROUTES
================================ */
const itemRoutes = require("./routes/items");
const adminRoutes = require("./routes/admin");

/* ================================
   PUBLIC ITEMS (OHNE LOGIN)
   ⚠️ MUSS VOR requireAuth KOMMEN
================================ */
app.use("/api/items/public", itemRoutes);

/* ================================
   PROTECTED ITEMS (MIT LOGIN)
================================ */
app.use("/api/items", requireAuth, itemRoutes);

/* ================================
   ADMIN (MIT LOGIN)
================================ */
app.use("/api/admin", requireAuth, adminRoutes);

/* ================================
   HEALTH
================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
