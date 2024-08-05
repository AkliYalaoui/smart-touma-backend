const admin = require("firebase-admin");
const { validateTemplate } = require("../utils/Validator.js");
const { convertTimestampToDateString } = require("../utils/dates.js");
const { StatusCodes } = require("http-status-codes");
const path = require("path");

const createTemplate = async (req, res) => {
  try {
    const { name, preview } = req.body;
    const normalizedName = validateTemplate(name, preview);

    const db = admin.firestore();
    const existingTemplatesSnapshot = await db
      .collection("templates")
      .where("name", "==", normalizedName)
      .get();

    if (!existingTemplatesSnapshot.empty) {
      throw new Error("Template name already exists");
    }

    const TemplateData = {
      name: normalizedName,
      preview,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("templates").add(TemplateData);

    res.status(StatusCodes.CREATED).json({
      id: docRef.id,
      ...TemplateData,
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const getTemplates = async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("templates").get();

    if (snapshot.empty) {
      return res.status(StatusCodes.OK).json([]);
    }

    const templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(StatusCodes.OK).json(templates);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const getTemplatePreview = (req, res) => {
  const { key, preview } = req.query;

  if (key !== process.env.API_KEY) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid API key" });
  }

  if (!preview) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Preview name is required" });
  }

  // Construct the file path based on template ID
  const filePath = path.join(__dirname, "../public", preview);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(StatusCodes.NOT_FOUND).json({ error: "Preview not found" });
    }
  });
};

const getDocuments = async (req, res) => {
  try {
    const uid = req.uid;
    const { templateId } = req.params;
    if (!uid) throw new Error("UID is required");
    if (!templateId) throw new Error("Template ID is required");

    const { pageSize = 10, pageToken } = req.query;
    const db = admin.firestore();
    const documentsRef = db
      .collection("documents")
      .where("user_id", "==", uid)
      .where("template", "==", db.doc(`templates/${templateId}`));

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
    res.status(StatusCodes.OK).json({ documents, nextPageToken });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = {
  getTemplates,
  createTemplate,
  getTemplatePreview,
  getDocuments,
};
