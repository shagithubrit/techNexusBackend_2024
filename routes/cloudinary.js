const express = require("express");
const { auth } = require("firebase-admin");
const router = express.Router();

//middlewares
const { authCheck, adminCheck } = require("../middlewares/auth");

//controllers
const { upload, remove } = require("../controllers/cloudinary");
const e = require("express");

router.post("/uploadimages", authCheck, adminCheck, upload);
router.post("/removeimages", authCheck, adminCheck, remove);

module.exports = router;
