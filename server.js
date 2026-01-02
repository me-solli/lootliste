console.log("SERVER.JS wird geladen");

/* ================================
   IMPORTS
================================ */
const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");

const db = require("./db");

/* ================================
   APP
================================ */
const app = express();

/* ================================
   PORT (RAILWAY – FINAL)
================================ */
const PORT = process.env.PORT;

console.log("🧪 process.env.PORT =", PORT);

if (!PORT) {
  console.error("❌ FEHLER: process.env.PORT ist nicht gesetzt (Railway)!");
  process.exit(1);
}

/* ================================
   CORS (GitHub Pages → Railway)
================================ */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://me-solli.github.io");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-login-id, x-admin-token"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

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
   UPLOADS (RAILWAY SAFE)
================================ */
const UPLOAD_DIR = "/data/uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 /data/uploads Verzeichnis erstellt");
}

app.use("/uploads", express.static(UPLOAD_DIR));

/* ================================
   AUTH (DEV)
================================ */
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];

  // DEV-LOGIN (nur DEV!)
  if (loginId === "dev-admin") {
    req.user = {
      id: "dev-user",
      role: "user"
    };
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

// Public (Index)
app.use("/api/items/public", itemRoutes);

// Protected (Submit, intern)
app.use("/api/items", requireAuth, itemRoutes);

/* ================================
   ADMIN
================================ */
app.use("/api/admin", adminRoutes);

/* ================================
   HEALTHCHECK
================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================================
   START SERVER
================================ */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server läuft auf Railway-Port ${PORT}`);
});
