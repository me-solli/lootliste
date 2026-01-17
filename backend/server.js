import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.resolve("data/items.json");

// statische Dateien (Screenshots)
app.use("/uploads", express.static("uploads"));

// GET /items
app.get("/items", (req, res) => {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const items = JSON.parse(raw);
  res.json(items);
});

app.listen(PORT, () => {
  console.log("Backend läuft auf Port", PORT);
});
