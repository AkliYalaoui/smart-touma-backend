const admin = require("firebase-admin");
const {validateTemplate} = require("../utils/Validator.js");
const { StatusCodes } = require("http-status-codes");
const path = require('path');

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
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid API key' });
  }

  if (!preview) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Preview name is required' });
  }

  // Construct the file path based on template ID
  const filePath = path.join(__dirname, '../public', preview);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Preview not found' });
    }
  });
};

module.exports = { getTemplates, createTemplate, getTemplatePreview };
