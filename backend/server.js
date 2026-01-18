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
   Daten (Railway Volume)
   =============================== */
const DATA_DIR = "/data";
const DATA_PATH = path.join(DATA_DIR, "items.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadItems() {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveItems(items) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

/* ===============================
   Migration alter Items (EINMALIG)
   =============================== */
let items = loadItems();

items = items.map(it => ({
  id: it.id ?? Date.now(),
  name: it.name ?? "Unbenannt",
  status: it.status ?? "verfügbar",
  createdAt: it.createdAt ?? new Date().toISOString(),

  quality: it.quality ?? null,
  category: it.category ?? null,
  screenshot: it.screenshot ?? null,

  donor: it.donor ?? "Community",

  // C1
  claimedBy: it.claimedBy ?? null,
  contact: it.contact ?? null,
  claimedAt: it.claimedAt ?? null,

  // C2
  handover: it.handover ?? {
    donorConfirmed: false,
    receiverConfirmed: false,
    donorConfirmedAt: null,
    receiverConfirmedAt: null
  }
}));

saveItems(items);

/* ===============================
   MINI-ACCOUNT
   =============================== */
function createPlayerId() {
  return "plr_" + crypto.randomBytes(4).toString("hex");
}

app.post("/player", (req, res) => {
  res.json({ playerId: createPlayerId() });
});

/* ===============================
   GET /items
   =============================== */
app.get("/items", (req, res) => {
  res.json(items);
});

/* ===============================
   POST /items
   =============================== */
app.post("/items", (req, res) => {
  const { name, quality, category, screenshot, playerId } = req.body;

  if (!name || !screenshot || !playerId) {
    return res.status(400).json({ error: "Pflichtfelder fehlen" });
  }

  const newItem = {
    id: Date.now(),
    name,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    quality: quality || null,
    category: category || null,
    screenshot,

    donor: playerId,

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
   CLAIM – RESERVIEREN (C1)
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
   HANDOVER – DONOR CONFIRM (C2)
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
   HANDOVER – RECEIVER CONFIRM (C2)
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
   Server
   =============================== */
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
