console.log("SERVER.JS wird geladen");

/* ================================
   GLOBAL CRASH PROTECTION
================================ */
process.on("unhandledRejection", (reason) => {
  console.error("❌ UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});

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
   PORT (RAILWAY – STRICT)
================================ */
const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ FATAL: process.env.PORT ist NICHT gesetzt");
  process.exit(1);
}

/* ================================
   CORS
================================ */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://me-solli.github.io");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-login-id, x-admin-token"
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
   ROOT + HEALTH (RAILWAY CHECK)
================================ */
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/* ================================
   UPLOADS
================================ */
const UPLOAD_DIR = "/data/uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 /data/uploads erstellt");
}

app.use("/uploads", express.static(UPLOAD_DIR));

/* ================================
   ROUTES
================================ */
const itemRoutes = require("./routes/items");
const adminRoutes = require("./routes/admin");
const itemRequestRoutes = require("./routes/itemRequests");

app.use("/api/items", itemRoutes);
app.use("/api/item-requests", itemRequestRoutes);
app.use("/api/admin", adminRoutes);

/* ================================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("❌ EXPRESS ERROR:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ================================
   START
================================ */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
