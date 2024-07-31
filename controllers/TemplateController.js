const admin = require("firebase-admin");
const { StatusCodes } = require("http-status-codes");

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

module.exports = { getTemplates };
