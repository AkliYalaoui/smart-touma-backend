const admin = require("firebase-admin");
const { StatusCodes } = require("http-status-codes");
const { convertTimestampToDateString } = require("../utils/dates.js");

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
    const recentDocuments = [];
    for (const doc of recentDocsSnapshot.docs) {
      const docData = doc.data();
      const templateDoc = await docData.template?.get();
      const templateName = templateDoc.exists ? templateDoc.data().name : "Unknown Template";
      const categoryDoc = await docData.category?.get();
      const categoryName = categoryDoc?.exists ? categoryDoc.data().name : "Unknown Category";

      recentDocuments.push({
        id: doc.id,
        ...docData,
        template: templateName,
        category: categoryName,
        created_at : convertTimestampToDateString(docData.created_at),
        embedding: []
      });
    }

    // 2. Most recent shared documents
    const sharedDocsQuery = db
      .collection("documents")
      .where("can_access", "array-contains", uid)
      .orderBy("created_at", "desc")
      .limit(5);

    const sharedDocsSnapshot = await sharedDocsQuery.get();
    const sharedDocuments = [];
    for (const doc of sharedDocsSnapshot.docs) {
      const docData = doc.data();
      const templateDoc = await docData.template?.get();
      const templateName = templateDoc.exists ? templateDoc.data().name : "Unknown Template";
      const categoryDoc = await docData.category?.get();
      const categoryName = categoryDoc?.exists ? categoryDoc.data().name : "Unknown Category";

      sharedDocuments.push({
        id: doc.id,
        ...docData,
        template: templateName,
        category: categoryName,
        created_at : convertTimestampToDateString(docData.created_at),
        embedding: []
      });
    }

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
      created_at : convertTimestampToDateString(doc.data().created_at),
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
      created_at : convertTimestampToDateString(doc.data().created_at)
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
