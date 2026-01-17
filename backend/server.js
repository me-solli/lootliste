import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   CORS (Browser + Preflight)
   =============================== */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

/* ===============================
   Middleware
   =============================== */
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ===============================
   Healthcheck (WICHTIG für Railway)
   =============================== */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ===============================
   Datenpfad
   =============================== */
const DATA_PATH = path.resolve("data/items.json");

/* ===============================
   Hilfsfunktionen
   =============================== */
function loadItems() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading data/items.json:", err.message);
    return [];
  }
}

function saveItems(items) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

/* ===============================
   GET /items
   =============================== */
app.get("/items", (req, res) => {
  const items = loadItems();
  res.json(items);
});

/* ===============================
   POST /items
   =============================== */
app.post("/items", (req, res) => {
  const items = loadItems();

  const newItem = {
    id: Date.now(),
    name: req.body?.name || "Unbenannt",
    status: "verfügbar",
    createdAt: new Date().toISOString()
  };

  items.push(newItem);
  saveItems(items);

  res.status(201).json(newItem);
});

/* ===============================
   Server starten
   =============================== */
app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
