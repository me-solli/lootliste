const express = require("express");
const app = express();

/* ================================
   DB (JETZT WIEDER AKTIV)
================================ */
require("./db");
console.log("DB loaded");

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
