const express = require("express");
const router = express.Router();
const TemplateController = require("../controllers/TemplateController.js");
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");

router.get("/", verifyTokenAndApiKey, TemplateController.getTemplates);
router.post("/", verifyTokenAndApiKey, TemplateController.createTemplate);
router.get('/preview', TemplateController.getTemplatePreview);
router.get('/:templateId/documents', verifyTokenAndApiKey, TemplateController.getDocuments);

module.exports = router;
