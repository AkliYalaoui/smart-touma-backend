const admin = require("firebase-admin");
const { StatusCodes } = require("http-status-codes");
const { validateCategory } = require("../utils/Validator.js");
const { convertTimestampToDateString } = require("../utils/dates.js");

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const uid = req.uid;
    const normalizedName = validateCategory(name, description);

    const db = admin.firestore();
    const existingCategoriesSnapshot = await db
      .collection("categories")
      .where("user_id", "==", uid)
      .where("name", "==", normalizedName)
      .get();

    if (!existingCategoriesSnapshot.empty) {
      throw new Error("Category name already exists");
    }

    const categoryData = {
      name: normalizedName,
      description,
      user_id: uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("categories").add(categoryData);

    res.status(StatusCodes.CREATED).json({
      id: docRef.id,
      ...categoryData,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const uid = req.uid;
    const db = admin.firestore();
    const snapshot = await db
      .collection("categories")
      .where("user_id", "==", uid)
      .get();

    if (snapshot.empty) {
      return res.status(StatusCodes.OK).json([]);
    }

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: convertTimestampToDateString(doc.data().created_at),
    }));
    res.status(StatusCodes.OK).json(categories);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const uid = req.uid;
    const { categoryId } = req.params;

    if (!categoryId) throw new Error("Category ID is required");

    const db = admin.firestore();
    const docRef = db.collection("categories").doc(categoryId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Category not found" });
    }

    if (docSnapshot.data().user_id != uid) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }
    res.status(StatusCodes.OK).json({
      id: docSnapshot.id,
      ...docSnapshot.data(),
      created_at: convertTimestampToDateString(docSnapshot.data().created_at),
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const uid = req.uid;
    const { categoryId } = req.params;
    const { name, description } = req.body;

    if (!categoryId) throw new Error("Category ID is required");

    const db = admin.firestore();
    const docRef = db.collection("categories").doc(categoryId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Category not found" });
    }

    if (docSnapshot.data().user_id != uid) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const updatedData = {};
    if (name) {
      const normalizedName = validateCategory(name, description);
      const existingCategoriesSnapshot = await db
        .collection("categories")
        .where("user_id", "==", uid)
        .where("name", "==", normalizedName)
        .get();

      if (
        !existingCategoriesSnapshot.empty &&
        existingCategoriesSnapshot.docs[0].id !== categoryId
      ) {
        throw new Error("Category name already exists");
      }
      updatedData.name = normalizedName;
    }

    if (description) updatedData.description = description;

    await docRef.update(updatedData);

    res.status(StatusCodes.OK).json({ id: categoryId, ...updatedData });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const uid = req.uid;
    const { categoryId } = req.params;

    if (!categoryId) throw new Error("Category ID is required");

    const db = admin.firestore();
    const docRef = db.collection("categories").doc(categoryId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Category not found" });
    }

    if (docSnapshot.data().user_id != uid) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    await docRef.delete();

    res
      .status(StatusCodes.OK)
      .json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const uid = req.uid;
    const { categoryId } = req.params;
    if (!uid) throw new Error("UID is required");
    if (!categoryId) throw new Error("Category ID is required");

    const { pageSize = 10, pageToken } = req.query;
    const db = admin.firestore();

    const category_snapshot = await db
      .collection("categories")
      .doc(categoryId)
      .get();
    if (!category_snapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Template not found" });
    }

    const documentsRef = db
      .collection("documents")
      .where("user_id", "==", uid)
      .where("category", "==", db.doc(`categories/${categoryId}`));

    let query = documentsRef.limit(parseInt(pageSize, 10));

    if (pageToken) {
      const snapshot = await db.collection("documents").doc(pageToken).get();
      if (!snapshot.exists) throw new Error("Invalid page token");

      query = query.startAfter(snapshot);
    }

    const snapshot = await query.get();
    const documents = [];
    let lastVisible = null;
    for (const doc of snapshot.docs) {
      const docData = doc.data();
      const templateDoc = await docData.template?.get();
      const templateName = templateDoc.exists
        ? templateDoc.data().name
        : "Unknown Template";
      const categoryDoc = await docData.category?.get();
      const categoryName = categoryDoc?.exists
        ? categoryDoc.data().name
        : "Unknown Category";

      documents.push({
        id: doc.id,
        ...docData,
        template: templateName,
        category: categoryName,
        created_at: convertTimestampToDateString(docData.created_at),
        embedding: [],
      });
      lastVisible = doc;
    }

    const nextPageToken = lastVisible ? lastVisible.id : null;
    res
      .status(StatusCodes.OK)
      .json({
        documents,
        nextPageToken,
        category: category_snapshot.data().name,
      });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getDocuments,
};
