const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "core-api" });
});

// TODO: Class / Post / Material / Exercise routes

const port = process.env.PORT || 4002;
app.listen(port, "0.0.0.0", () => {
  console.log(`core-api on ${port}`);
});
