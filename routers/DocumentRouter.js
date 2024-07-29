const router = require("express").Router();
const verifyTokenAndApiKey = require('../middlewares/AuthMiddleware.js');
const upload = require('../middlewares/ImageMiddleware.js');
const {getDocuments, processImages} = require("../controllers/DocumentController.js");

router.get("/", verifyTokenAndApiKey, getDocuments);
router.post("/process", verifyTokenAndApiKey, upload, processImages);

module.exports = router;