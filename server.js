console.log("SERVER.JS wird geladen");

/* ================================
   IMPORTS
================================ */
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const db = require("./db");

/* ================================
   ITEM STATUS (STEP A2.1)
================================ */
const ITEM_STATUS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  HIDDEN: "hidden",
  REJECTED: "rejected"
};

/* ================================
   APP
================================ */
const app = express();
const PORT = process.env.PORT || 8080;

/* ================================
   CORS (GitHub Pages → Railway)
================================ */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://me-solli.github.io");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-token, x-login-id"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
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

/* ================================
   🔍 DB TABELLEN DEBUG (WICHTIG!)
================================ */
db.all(
  "SELECT name FROM sqlite_master WHERE type='table'",
  [],
  (err, rows) => {
    if (err) {
      console.error("❌ DB TABELLEN FEHLER:", err.message);
    } else {
      console.log("📦 DB TABELLEN:", rows);
    }
  }
);

/* ================================
   AUTH (USER)
================================ */
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];

  // DEV-BYPASS
  if (loginId === "dev-admin") {
    req.user = { id: "dev-user", role: "user" };
    return next();
  }

  return res.status(401).json({ error: "Nicht eingeloggt" });
}

/* ================================
   ROUTES
================================ */
const itemRoutes = require("./routes/items");
const adminRoutes = require("./routes/admin");

/* ================================
   ITEMS
================================ */
app.use("/api/items/public", itemRoutes);
app.use("/api/items", requireAuth, itemRoutes);

/* ================================
   ADMIN API
================================ */
app.use("/api/admin", adminRoutes);

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
