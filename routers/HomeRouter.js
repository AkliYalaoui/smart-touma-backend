const express = require('express');
const router = express.Router();
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");
const HomeController = require('../controllers/HomeController.js');

router.get('/', verifyTokenAndApiKey, HomeController.getScreenPageData);

module.exports = router;