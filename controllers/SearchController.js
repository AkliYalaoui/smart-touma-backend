const admin = require("firebase-admin");
const { StatusCodes } = require("http-status-codes");
const { genAI } = require("../gemini.js");

const searchDocuments = async (req, res) => {
  try {
    const { categoryId, templateId, sharedBy, search = "" } = req.query;
    const { uid } = req;
    const db = admin.firestore();

    // Base query
    let query = db.collection("documents").where("user_id", "==", uid);

    // Apply filters
    if (categoryId) {
      query = query.where("category", "==", db.doc(`categories/${categoryId}`));
    }
    if (templateId) {
      query = query.where("template", "==", db.doc(`templates/${templateId}`));
    }
    if (sharedBy) {
      query = query.where("can_access", "array-contains", sharedBy);
    }

    // Perform search in title and LaTeX code
    if (search) {
      const em_model = genAI.getGenerativeModel({
        model: "text-embedding-004",
      });
      const result = await em_model.embedContent(search);
      const embedding = result.embedding.values;

      query = query.findNearest(
        "embedding",
        admin.firestore.FieldValue.vector(embedding),
        {
          limit: 2,
          distanceMeasure: "COSINE",
        }
      );
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(StatusCodes.OK).json([]);
    }

    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      embedding: []
    }));

    res.status(StatusCodes.OK).json(documents);
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = { searchDocuments };
