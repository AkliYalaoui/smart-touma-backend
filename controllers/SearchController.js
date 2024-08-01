const admin = require("firebase-admin");
const { StatusCodes } = require("http-status-codes");

const searchDocuments = async (req, res) => {
  try {
    const {
      categoryId,
      templateId,
      sharedBy,
      sortBy = "timestamp",
      search = "",
    } = req.query;
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
      query = query
        .where("title", ">=", search)
        .where("title", "<=", search + "\uf8ff");
      query = query
        .where("latex_code", ">=", search)
        .where("latex_code", "<=", search + "\uf8ff");
    }

    // Apply sorting
    if (sortBy === "title") {
      query = query.orderBy("title");
    } else if (sortBy === "timestamp") {
      query = query.orderBy("timestamp", "desc");
    } else {
      // Note: This would require custom logic for pertinence scoring, which isn't natively supported by Firestore
      throw new Error(
        "Sorting by pertinence is not supported natively in Firestore."
      );
    }

    // Limit the results
    query = query.limit(10);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(StatusCodes.OK).json([]);
    }

    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(StatusCodes.OK).json(documents);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = { searchDocuments };
