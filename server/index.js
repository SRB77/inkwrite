const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const routes = require("./src/routes");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
