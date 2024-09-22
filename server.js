const express = require("express");
const https = require("https");
const fs = require("fs");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const { readdirSync } = require("fs");
require("dotenv").config();

const key = fs.readFileSync(__dirname + "/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/selfsigned.crt");
const options = {
  key: key,
  cert: cert,
};

//app
const app = express();

//db
const dbUrl = process.env.DATABASE || "mongodb://localhost:27017/MernProj";
mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB Error => ", err));

//middleware
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "2mb" }));
app.use(cors());

//routes middleware
readdirSync("./routes").map((r) => app.use("/api", require("./routes/" + r)));

//port
const port = process.env.PORT || 8000;
const portSSL = process.env.PORT_SSL || 8443;
app.listen(port, () => console.log(`Server is running on ${port}`));
const server = https.createServer(options, app);
server.listen(portSSL, () =>
  console.log(`Https server is running on ${portSSL}`)
);
