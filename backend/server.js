console.log("SERVER.JS AUS lootliste-backend WIRD GELADEN");

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// 👉 DB initialisieren (SQLite)
const db = require("./db");

// 👉 Routes
const itemRoutes = require("./routes/items");
console.log("ITEM ROUTES GELADEN:", typeof itemRoutes);

const app = express();

// 🔑 WICHTIG: Railway-kompatibler Port
const PORT = process.env.PORT || 3000;

// ===== SESSION KONFIG =====
const SESSION_DURATION_MINUTES = 60; // 1 Stunde

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== DATEIEN =====
const USERS_FILE = path.join(__dirname, "users.json");

// ===== IN-MEMORY SESSIONS =====
const sessions = {};

// ===== HILFSFUNKTIONEN =====
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

// ===== AUTH MIDDLEWARE =====
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];
  const session = getSession(loginId);

  if (!session) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }

  req.session = session;
  req.loginId = loginId;
  req.user = { id: session.userId };

  next();
}

// ===== HEALTH =====
app.get("/", (req, res) => {
  res.send("Backend läuft 👌");
});

// ===== DEBUG (DB DIREKT) =====
app.get("/__debug/items", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM items");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username & Passwort nötig" });
  }

  if (password.length < 5) {
    return res.status(400).json({ error: "Passwort zu kurz (min. 5 Zeichen)" });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Username existiert bereits" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: crypto.randomUUID(),
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 1,
    itemsGiven: 0,
    itemsReceived: 0
  };

  users.push(newUser);
  saveUsers(users);

  res.json({
    message: "Registrierung erfolgreich",
    user: {
      id: newUser.id,
      username: newUser.username
    }
  });
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username & Passwort nötig" });
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: "User nicht gefunden" });
  }

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) {
    return res.status(401).json({ error: "Passwort falsch" });
  }

  const loginId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;

  sessions[loginId] = {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt
  };

  res.json({
    message: "Login erfolgreich",
    loginId,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

// ===== PROFIL =====
app.get("/me", requireAuth, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);

  if (!user) {
    return res.status(404).json({ error: "User nicht gefunden" });
  }

  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    level: user.level,
    xp: user.xp,
    itemsGiven: user.itemsGiven,
    itemsReceived: user.itemsReceived
  });
});

// ===== LOGOUT =====
app.post("/logout", requireAuth, (req, res) => {
  delete sessions[req.loginId];
  res.json({ message: "Logout ok" });
});

// =====================================
// ===== STEP 4 – ITEM BEDARF =====
// =====================================
db.run(`
  CREATE TABLE IF NOT EXISTS item_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, user_id)
  )
`);

app.post("/api/items/:id/request", requireAuth, (req, res) => {
  const itemId = req.params.id;
  const userId = req.user.id;

  db.get(
    "SELECT status FROM items WHERE id = ?",
    [itemId],
    (err, item) => {
      if (err) return res.status(500).json({ error: "DB Fehler" });
      if (!item) return res.status(404).json({ error: "Item nicht gefunden" });
      if (item.status !== "available") {
        return res.status(400).json({ error: "Item nicht verfügbar" });
      }

      db.run(
        "INSERT INTO item_requests (item_id, user_id) VALUES (?, ?)",
        [itemId, userId],
        err => {
          if (err) {
            return res.status(400).json({ error: "Bedarf bereits angemeldet" });
          }

          db.get(
            "SELECT COUNT(*) AS count FROM item_requests WHERE item_id = ?",
            [itemId],
            (err, row) => {
              if (err) return res.status(500).json({ error: "DB Fehler" });

              res.json({
                success: true,
                requests: row.count
              });
            }
          );
        }
      );
    }
  );
});

app.get("/api/items/:id/requests/count", requireAuth, (req, res) => {
  const itemId = req.params.id;

  db.get(
    "SELECT COUNT(*) AS count FROM item_requests WHERE item_id = ?",
    [itemId],
    (err, row) => {
      if (err) return res.status(500).json({ error: "DB Fehler" });
      res.json({ count: row.count });
    }
  );
});

// ================================
// ===== API ROUTES (V3) =====
// ================================
app.use("/api/items", requireAuth, itemRoutes);

// ===== SERVER START =====
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
