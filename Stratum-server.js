const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({ status: "STRATUM API running" });
});
app.post("/analyze", async (req, res) => {
  res.json({ test: "working" });
});
app.listen(process.env.PORT || 3001, "0.0.0.0", () => {
  console.log("STRATUM server running");
});
