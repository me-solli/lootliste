import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   CORS
   =============================== */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

/* ===============================
   Healthcheck
   =============================== */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ===============================
   Daten
   =============================== */
const DATA_PATH = path.resolve("data/items.json");

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveItems(items) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

/* ===============================
   MINI-ACCOUNT
   =============================== */
function createPlayerId() {
  return "plr_" + crypto.randomBytes(4).toString("hex");
}

/* Spieler-ID holen oder erzeugen */
app.post("/player", (req, res) => {
  const playerId = createPlayerId();
  res.json({ playerId });
});

/* ===============================
   GET /items
   =============================== */
app.get("/items", (req, res) => {
  const items = loadItems();
  res.json(items.filter(i => i.status === "verfügbar"));
});

/* ===============================
   POST /items
   =============================== */
app.post("/items", (req, res) => {
  const items = loadItems();

  const newItem = {
    id: Date.now(),
    name: req.body.name || "Unbenannt",
    status: "verfügbar",
    createdAt: new Date().toISOString(),
    claimedBy: null,
    contact: null,
    claimedAt: null
  };

  items.push(newItem);
  saveItems(items);
  res.status(201).json(newItem);
});

/* ===============================
   CLAIM (Drop-Logik)
   =============================== */
app.post("/items/:id/claim", (req, res) => {
  const { playerId, contact } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: "playerId required" });
  }

  const items = loadItems();
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.status !== "verfügbar") {
    return res.status(409).json({ error: "Item already claimed" });
  }

  item.status = "vergeben";
  item.claimedBy = playerId;
  item.contact = contact || null;
  item.claimedAt = new Date().toISOString();

  saveItems(items);
  res.json({ success: true });
});

/* ===============================
   Server
   =============================== */
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
