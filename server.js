const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

console.log("SERVER.JS wird geladen");

const app = express();

/* ================================
   CORS
================================ */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* ================================
   DB
================================ */
const DB_PATH = "/data/lootliste.db";

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB Fehler:", err.message);
    process.exit(1);
  }
  console.log("✅ SQLite DB verbunden:", DB_PATH);
});

/* ================================
   PORT
================================ */
const PORT = process.env.PORT || 8080;
console.log("PORT =", PORT);

/* ================================
   ROOT
================================ */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ================================
   PUBLIC ITEMS (TEST)
================================ */
app.get("/api/items/public", (req, res) => {
  res.json([]);
});

/* ================================
   START
================================ */
app.listen(PORT, "0.0.0.0", () => {
  console.log("LISTENING ON", PORT);
});
