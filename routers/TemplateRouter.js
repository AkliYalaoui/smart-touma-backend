const express = require("express");
const router = express.Router();
const TemplateController = require("../controllers/TemplateController.js");
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");

router.get("/", verifyTokenAndApiKey, TemplateController.getTemplates);

module.exports = router;
