const router = require("express").Router();
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");
const upload = require("../middlewares/ImageMiddleware.js");
const DocumentController = require("../controllers/DocumentController.js");

router.get("/", verifyTokenAndApiKey, DocumentController.getDocuments);
router.get("/shared", verifyTokenAndApiKey, DocumentController.getSharedDocuments);
router.get("/:docId", verifyTokenAndApiKey, DocumentController.getDocumentById);
router.post("/", verifyTokenAndApiKey, upload, DocumentController.addDocument);
router.put("/:docId", verifyTokenAndApiKey, DocumentController.updateDocument);
router.delete(
  "/:docId",
  verifyTokenAndApiKey,
  DocumentController.deleteDocument
);

module.exports = router;
