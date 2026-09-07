const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth-service" });
});

// TODO: POST /auth/register, /auth/login, /auth/refresh

const port = process.env.PORT || 4001;
app.listen(port, "0.0.0.0", () => {
  console.log(`auth-service on ${port}`);
});
