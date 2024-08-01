const express = require('express');
const router = express.Router();
const PDFDocController = require('../controllers/PDFDocController.js');
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");

router.post('/:docId/share',verifyTokenAndApiKey, PDFDocController.shareDocument);
router.put('/:docId/category', verifyTokenAndApiKey, PDFDocController.updateDocumentCategory);
router.get('/:docId/latex',verifyTokenAndApiKey, PDFDocController.downloadLatexCode);
router.post('/:docId/qa', verifyTokenAndApiKey, PDFDocController.documentQA);
router.get('/documents/:docId/qas', verifyTokenAndApiKey, PDFDocController.getDocumentQAs);

module.exports = router;
