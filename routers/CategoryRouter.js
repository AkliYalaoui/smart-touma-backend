const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/CategoryController.js");
const verifyTokenAndApiKey = require("../middlewares/AuthMiddleware.js");

router.post("/", verifyTokenAndApiKey, CategoryController.createCategory);
router.get("/", verifyTokenAndApiKey, CategoryController.getCategories);
router.get(
  "/:categoryId",
  verifyTokenAndApiKey,
  CategoryController.getCategoryById
);
router.put(
  "/:categoryId",
  verifyTokenAndApiKey,
  CategoryController.updateCategory
);
router.delete(
  "/:categoryId",
  verifyTokenAndApiKey,
  CategoryController.deleteCategory
);

router.get(
  "/:categoryId/documents",
  verifyTokenAndApiKey,
  CategoryController.getDocuments
);

module.exports = router;
