const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const uid = req.uid;

    if (!name) throw new Error("Category name is required");

    const db = admin.firestore();
    const categoryData = { name, description, user_id: uid };

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
    res
      .status(StatusCodes.OK)
      .json({ id: docSnapshot.id, ...docSnapshot.data() });
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
    if (name) updatedData.name = name;
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

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};