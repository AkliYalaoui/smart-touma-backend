const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/SearchController.js');
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");

router.get('/',verifyTokenAndApiKey, SearchController.searchDocuments); 
module.exports = router;