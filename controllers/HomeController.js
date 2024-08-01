const admin = require("firebase-admin");
const { StatusCodes } = require("http-status-codes");

const getScreenPageData = async (req, res) => {
  try {
    const uid = req.uid;
    if (!uid) throw new Error("UID is required");

    const db = admin.firestore();

    // 1. Most recent created documents
    const recentDocsQuery = db
      .collection("documents")
      .where("user_id", "==", uid)
      .orderBy("created_at", "desc")
      .limit(5);

    const recentDocsSnapshot = await recentDocsQuery.get();
    const recentDocuments = recentDocsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 2. Most recent shared documents
    const sharedDocsQuery = db
      .collection("documents")
      .where("can_access", "array-contains", uid)
      .orderBy("created_at", "desc")
      .limit(5);

    const sharedDocsSnapshot = await sharedDocsQuery.get();
    const sharedDocuments = sharedDocsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 3. Latest categories
    const latestCategoriesQuery = db
      .collection("categories")
      .where("user_id", "==", uid)
      .orderBy("created_at", "desc")
      .limit(5);

    const latestCategoriesSnapshot = await latestCategoriesQuery.get();
    const latestCategories = latestCategoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 4. Latest templates
    const latestTemplatesQuery = db
      .collection("templates")
      .orderBy("created_at", "desc")
      .limit(5);

    const latestTemplatesSnapshot = await latestTemplatesQuery.get();
    const latestTemplates = latestTemplatesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(StatusCodes.OK).json({
      recentDocuments,
      sharedDocuments,
      latestCategories,
      latestTemplates,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = { getScreenPageData };
