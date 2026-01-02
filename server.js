console.log("SERVER.JS wird geladen");

/* ================================
   IMPORTS
================================ */
const express = require("express");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const db = require("./db");

/* ================================
   APP
================================ */
const app = express();

/* ================================
   PORT (RAILWAY)
================================ */
const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ FEHLER: process.env.PORT ist nicht gesetzt");
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
    "Content-Type, x-login-id, x-admin-token"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // wichtig für Firefox
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
  console.log("📁 /data/uploads erstellt");
}

app.use("/uploads", express.static(UPLOAD_DIR));

/* ================================
   DEV AUTH (TEMP)
================================ */
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];

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
// 🔥 RICHTIG:
// /api/items/public  → router.get("/public")
// /api/items          → router.get("/"), router.post("/")

app.use("/api/items", itemRoutes);               // public + intern
app.use("/api/items", requireAuth, itemRoutes);  // protected POST etc.

/* ================================
   ADMIN
================================ */
app.use("/api/admin", adminRoutes);

/* ================================
   HEALTH
================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================================
   START
================================ */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
