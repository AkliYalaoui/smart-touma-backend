const router = require("express").Router();
const verifyTokenAndApiKey = require('../middlewares/AuthMiddleware.js');
const {getDocuments, processImages} = require("../controllers/DocumentController.js");

router.get("/", getDocuments);
router.post("/process", verifyTokenAndApiKey, processImages);



module.exports = router;