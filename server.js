const express = require("express");
const sqlite3 = require("sqlite3").verbose();

console.log("SERVER.JS wird geladen");

const app = express();

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
   ROOT TEST
================================ */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ================================
   START
================================ */
app.listen(PORT, "0.0.0.0", () => {
  console.log("LISTENING");
});
