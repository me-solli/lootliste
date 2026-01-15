const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;
console.log("PORT =", PORT);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("LISTENING");
});
