console.log("SERVER.JS wird geladen");

/* ================================
   GLOBAL SAFETY
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
require("./db"); // nur laden, NICHT abbrechen

/* ================================
   APP
================================ */
const app = express();

/* ================================
   PORT (Railway tolerant)
================================ */
const PORT = process.env.PORT || 8080;
console.log("🌐 Using PORT =", PORT);

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
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/* ================================
   BODY PARSER
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================================
   ROOT + HEALTH
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
}
app.use("/uploads", express.static(UPLOAD_DIR));

/* ================================
   ROUTES
================================ */
app.use("/api/items", require("./routes/items"));
app.use("/api/item-requests", require("./routes/itemRequests"));
app.use("/api/admin", require("./routes/admin"));

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
