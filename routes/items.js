const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================
   Upload-Ordner sicherstellen
========================= */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   Multer (minimal, stabil)
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, "test_" + Date.now() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =========================
   POST /api/items
   FINALER PROOF (kein DB)
========================= */
router.post("/", upload.single("screenshot"), (req, res) => {
  if (!req.file) {
    console.error("❌ Kein File empfangen");
    return res.status(400).json({ error: "Kein Screenshot empfangen" });
  }

  console.log("📸 TEST UPLOAD OK:", req.file.filename);

  res.json({
    success: true,
    file: "/uploads/" + req.file.filename
  });
});

module.exports = router;
