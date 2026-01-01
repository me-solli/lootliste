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
   WICHTIG: Kein Credentials, kein Cookie
================================ */
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://me-solli.github.io"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-token"
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
   STATIC FILES (Uploads only)
================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================================
   AUTH MIDDLEWARE (USER)
   Nur für /api/items (Submit etc.)
================================ */
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];

  // DEV-BYPASS (nur für Tests / Submit)
  if (loginId === "dev-admin" || process.env.NODE_ENV !== "production") {
    req.user = {
      id: "dev-user",
      username: "dev",
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
   PUBLIC ITEMS (OHNE LOGIN)
================================ */
app.use("/api/items/public", itemRoutes);

/* ================================
   PROTECTED ITEMS (SUBMIT etc.)
================================ */
app.use("/api/items", requireAuth, itemRoutes);

/* ================================
   ADMIN API
   Auth NUR über x-admin-token
================================ */
app.use("/api/admin", adminRoutes);

/* ================================
   HEALTH CHECK
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
