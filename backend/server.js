import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   BASIC / CORS
=============================== */
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-User-Id"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-User-Id"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

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
const USERS_PATH = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

let items = loadJSON(ITEMS_PATH, []);
let users = loadJSON(USERS_PATH, []);

/* ===============================
   USER SYSTEM (MINIMAL & EXPLIZIT)
=============================== */
function createUser() {
  const user = {
    id: "usr_" + crypto.randomBytes(6).toString("hex"),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveJSON(USERS_PATH, users);
  return user;
}

// Middleware: garantiert IMMER eine User-ID
app.use((req, res, next) => {
  const headerId = req.headers["x-user-id"];
  let user = users.find(u => u.id === headerId);

  if (!user) {
    user = createUser();
  }

  req.user = user;
  res.setHeader("X-User-Id", user.id);
  next();
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
  const { name, quality, type, category, screenshot, season } = req.body;

  if (!name || !screenshot) {
    return res.status(400).json({ error: "Pflichtfelder fehlen" });
  }

  const newItem = {
    id: Date.now(),
    name,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    quality: quality || null,
    type: type || category || null,
    screenshot,

    season: season || "non-ladder",

    // 🔑 EINDEUTIGER BESITZER
    donorId: req.user.id,

    claimedByUserId: null,
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
  saveJSON(ITEMS_PATH, items);

  res.status(201).json(newItem);
});

/* ===============================
   CLAIM
=============================== */
app.post("/items/:id/claim", (req, res) => {
  const { contact } = req.body;
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.status !== "verfügbar") {
    return res.status(409).json({ error: "Item not available" });
  }

  item.status = "reserviert";
  item.claimedByUserId = req.user.id;
  item.contact = contact || null;
  item.claimedAt = new Date().toISOString();

  saveJSON(ITEMS_PATH, items);
  res.json({ success: true });
});

/* ===============================
   HANDOVER – DONOR CONFIRM
=============================== */
app.post("/items/:id/handover/donor", (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.donorId !== req.user.id) {
    return res.status(403).json({ error: "Not donor" });
  }

  item.handover.donorConfirmed = true;
  item.handover.donorConfirmedAt = new Date().toISOString();

  if (item.handover.receiverConfirmed) {
    item.status = "übergeben";
  }

  saveJSON(ITEMS_PATH, items);
  res.json({ success: true, status: item.status });
});

/* ===============================
   HANDOVER – RECEIVER CONFIRM
=============================== */
app.post("/items/:id/handover/receiver", (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.claimedByUserId !== req.user.id) {
    return res.status(403).json({ error: "Not receiver" });
  }

  item.handover.receiverConfirmed = true;
  item.handover.receiverConfirmedAt = new Date().toISOString();

  if (item.handover.donorConfirmed) {
    item.status = "übergeben";
  }

  saveJSON(ITEMS_PATH, items);
  res.json({ success: true, status: item.status });
});

/* ===============================
   SERVER
=============================== */
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
