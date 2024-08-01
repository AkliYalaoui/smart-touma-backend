const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/SearchController.js');


router.get('/', SearchController.searchDocuments); 
module.exports = router;