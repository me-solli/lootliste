import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   BASIC SETUP
   =============================== */
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/* ===============================
   HEALTHCHECK
   =============================== */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ===============================
   DATA (Railway Volume)
   =============================== */
const DATA_DIR = "/data";
const ITEMS_PATH = path.join(DATA_DIR, "items.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadItems() {
  if (!fs.existsSync(ITEMS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ITEMS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveItems(items) {
  fs.writeFileSync(ITEMS_PATH, JSON.stringify(items, null, 2), "utf-8");
}

let items = loadItems();

/* ===============================
   ID HELPERS
   =============================== */
function createItemId() {
  return Date.now();
}

function createTempPlayerId() {
  // Übergangslösung – wird später durch echte user_id ersetzt
  return "plr_" + crypto.randomBytes(4).toString("hex");
}

/* ===============================
   TEMP PLAYER (ÜBERGANG)
   =============================== */
app.post("/player", (req, res) => {
  res.json({ playerId: createTempPlayerId() });
});

/* ===============================
   GET ITEMS
   =============================== */
app.get("/items", (req, res) => {
  res.json(items);
});

/* ===============================
   POST ITEM
   =============================== */
app.post("/items", (req, res) => {
  const { name, quality, category, screenshot, playerId } = req.body;

  if (!name || !screenshot || !playerId) {
    return res.status(400).json({ error: "Pflichtfelder fehlen" });
  }

  const newItem = {
    id: createItemId(),
    name,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    quality: quality || null,
    category: category || null,
    screenshot,

    // IDENTITÄT (Übergang)
    donor: playerId, // später: user_id

    claimedBy: null,
    contact: null,
    claimedAt: null,

    handover: {
      donorConfirmed: false,
      receiverConfirmed: false,
      donorConfirmedAt: null,
      receiverConfirmedAt: null
    }
  };

  items.push(newItem);
  saveItems(items);

  res.status(201).json(newItem);
});

/* ===============================
   CLAIM (RESERVIEREN)
   =============================== */
app.post("/items/:id/claim", (req, res) => {
  const { playerId, contact } = req.body;
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.status !== "verfügbar") {
    return res.status(409).json({ error: "Item not available" });
  }

  item.status = "reserviert";
  item.claimedBy = playerId;
  item.contact = contact || null;
  item.claimedAt = new Date().toISOString();

  saveItems(items);
  res.json({ success: true });
});

/* ===============================
   HANDOVER – DONOR CONFIRM
   =============================== */
app.post("/items/:id/handover/donor", (req, res) => {
  const { playerId } = req.body;
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.status !== "reserviert") {
    return res.status(409).json({ error: "Wrong state" });
  }
  if (item.donor !== playerId) {
    return res.status(403).json({ error: "Not donor" });
  }

  item.handover.donorConfirmed = true;
  item.handover.donorConfirmedAt = new Date().toISOString();

  if (item.handover.receiverConfirmed) {
    item.status = "übergeben";
  }

  saveItems(items);
  res.json({ success: true, status: item.status });
});

/* ===============================
   HANDOVER – RECEIVER CONFIRM
   =============================== */
app.post("/items/:id/handover/receiver", (req, res) => {
  const { playerId } = req.body;
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.status !== "reserviert") {
    return res.status(409).json({ error: "Wrong state" });
  }
  if (item.claimedBy !== playerId) {
    return res.status(403).json({ error: "Not receiver" });
  }

  item.handover.receiverConfirmed = true;
  item.handover.receiverConfirmedAt = new Date().toISOString();

  if (item.handover.donorConfirmed) {
    item.status = "übergeben";
  }

  saveItems(items);
  res.json({ success: true, status: item.status });
});

/* ===============================
   SERVER START
   =============================== */
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
