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

app.use(
  express.static(__dirname, {
    index: false,
    extensions: ["html"]
  })
);

/* ================================
   DEV AUTH MIDDLEWARE
================================ */
function requireAuth(req, res, next) {
  const loginId = req.headers["x-login-id"];

  if (loginId === "dev-admin") {
    req.user = {
      id: "admin-1",
      username: "admin",
      role: "admin"
    };
    return next();
  }

  return res.status(401).json({ error: "Nicht eingeloggt (Dev-Modus)" });
}

/* ================================
   ROUTES
================================ */
const itemRoutes = require("./routes/items");
const adminRoutes = require("./routes/admin");

/* ================================
   PUBLIC ITEMS
================================ */
app.use("/api/items/public", itemRoutes);

/* ================================
   PROTECTED ITEMS
================================ */
app.use("/api/items", requireAuth, itemRoutes);

/* ================================
   ADMIN
================================ */
app.use("/api/admin", requireAuth, adminRoutes);

/* ================================
   HTML FILE HANDLER
================================ */
app.get("/*.html", (req, res) => {
  const filePath = path.join(__dirname, req.path);

  res.sendFile(filePath, err => {
    if (err) {
      res.status(404).send("HTML nicht gefunden");
    }
  });
});

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
