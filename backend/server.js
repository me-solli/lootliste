// ===============================
// IMPORTS
// ===============================
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

// ===============================
// APP SETUP
// ===============================
const app = express();
const PORT = process.env.PORT || 8080;

// ===============================
// DATA PATH (Railway Volume)
// ===============================
const DATA_DIR = "/data";
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// ===============================
// MIDDLEWARE  ✅ CORS FINAL
// ===============================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-User-Id"]
}));

app.options("*", cors());
app.use(express.json());

// ===============================
// HELPERS
// ===============================
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===============================
// INIT DATA
// ===============================
ensureDataDir();
let items = loadJSON(ITEMS_FILE, []);
let users = loadJSON(USERS_FILE, []);

// ===============================
// USER SYSTEM (STABIL)
// ===============================
function createUser() {
  const id = "usr_" + Math.random().toString(16).slice(2, 14);
  const user = {
    id,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveJSON(USERS_FILE, users);
  return user;
}

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

// ===============================
// HEALTHCHECK
// ===============================
app.get("/", (req, res) => {
  res.send("Lootliste Backend OK");
});

// ===============================
// GET ITEMS
// ===============================
app.get("/items", (req, res) => {
  res.json(items);
});

// ===============================
// POST ITEM  ✅ donorUserId FINAL
// ===============================
app.post("/items", (req, res) => {
  const { name, quality, type, screenshot, season } = req.body;

  if (!name || !quality || !type || !screenshot || !season) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const newItem = {
    id: Date.now(),
    name,
    quality,
    type,
    screenshot,
    season,
    status: "verfügbar",
    createdAt: new Date().toISOString(),

    // 🔑 EINDEUTIGER BESITZER
    donorUserId: req.user.id,

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
  saveJSON(ITEMS_FILE, items);

  res.status(201).json(newItem);
});

// ===============================
// CLAIM ITEM
// ===============================
app.post("/items/:id/claim", (req, res) => {
  const item = items.find(i => i.id == req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  if (item.status !== "verfügbar") {
    return res.status(400).json({ error: "Item not available" });
  }

  item.status = "reserviert";
  item.claimedByUserId = req.user.id;
  item.claimedAt = new Date().toISOString();

  saveJSON(ITEMS_FILE, items);
  res.json(item);
});

// ===============================
// CONFIRM HANDOVER
// ===============================
app.post("/items/:id/confirm", (req, res) => {
  const item = items.find(i => i.id == req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  if (req.user.id === item.donorUserId) {
    item.handover.donorConfirmed = true;
    item.handover.donorConfirmedAt = new Date().toISOString();
  }

  if (req.user.id === item.claimedByUserId) {
    item.handover.receiverConfirmed = true;
    item.handover.receiverConfirmedAt = new Date().toISOString();
  }

  if (item.handover.donorConfirmed && item.handover.receiverConfirmed) {
    item.status = "vergeben";
  }

  saveJSON(ITEMS_FILE, items);
  res.json(item);
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
