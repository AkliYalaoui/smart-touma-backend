const express = require('express');
const router = express.Router();
const PDFDocController = require('../controllers/PDFDocController.js');

router.post('/:docId/share', PDFDocController.shareDocument);
router.put('/:docId/category', PDFDocController.updateDocumentCategory);
router.get('/:docId/latex', PDFDocController.downloadLatexCode);
router.post('/:docId/qa', PDFDocController.documentQA);
router.get('/documents/:docId/qas', PDFDocController.getDocumentQAs);

module.exports = router;
