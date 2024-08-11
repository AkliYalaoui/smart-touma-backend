const admin = require("firebase-admin");
const { model, qa_prompt } = require("../gemini.js");
const { StatusCodes } = require("http-status-codes");
const { convertTimestampToDateString } = require("../utils/dates.js");

const shareDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const userEmails = req.body.userEmails?.split(",").map((e) => e.trim());

    if (!docId || !Array.isArray(userEmails) || userEmails.length === 0) {
      throw new Error("Document ID and list of user Emails are required");
    }

    const uid = req.uid;
    const db = admin.firestore();
    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const docData = docSnapshot.data();
    if (docData.user_id !== uid) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const userIds = [];

    for (let email of userEmails) {
      const userId = (await admin.auth().getUserByEmail(email)).uid;
      userIds.push(userId);
    }
    const updatedCanAccess = Array.from(
      new Set([...docData.can_access, ...userIds])
    ); // Merge and remove duplicates
    await docRef.update({
      can_access: updatedCanAccess,
    });

    res
      .status(StatusCodes.OK)
      .json({ message: "Document shared successfully" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const updateDocumentCategory = async (req, res) => {
  try {
    const { docId } = req.params;
    const { categoryId } = req.body;

    if (!docId || !categoryId) {
      throw new Error("Document ID and category ID are required");
    }

    const uid = req.uid;
    const db = admin.firestore();
    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const docData = docSnapshot.data();
    if (docData.user_id !== uid) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    await docRef.update({ category: db.doc(`categories/${categoryId}`) });

    res
      .status(StatusCodes.OK)
      .json({ message: "Document category updated successfully" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const downloadLatexCode = async (req, res) => {
  try {
    const { docId } = req.params;

    if (!docId) throw new Error("Document ID is required");

    const uid = req.uid;
    const db = admin.firestore();
    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const docData = docSnapshot.data();
    if (docData.user_id !== uid && !docData.can_access.includes(uid)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const latexCode = docData.latex_code;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=document-${docId}.tex`
    );
    res.setHeader("Content-Type", "text/plain");
    res.send(latexCode);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const documentQA = async (req, res) => {
  try {
    const { docId } = req.params;
    const { question } = req.body;

    if (!docId || !question)
      throw new Error("Document ID and question are required");

    const uid = req.uid;
    const db = admin.firestore();
    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const docData = docSnapshot.data();
    if (docData.user_id !== uid && !docData.can_access.includes(uid)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const result = await model.generateContent([
      qa_prompt(docData.latex_code, question),
    ]);
    const response = await result.response;
    const answer = await response.text();

    // Store the Q&A interaction
    await db.collection("qa").add({
      user_id: uid,
      doc_id: docId,
      question,
      answer,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(StatusCodes.OK).json({ answer });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const getDocumentQAs = async (req, res) => {
  try {
    const { docId } = req.params;

    if (!docId) throw new Error("Document ID is required");

    const uid = req.uid;
    const db = admin.firestore();
    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const docData = docSnapshot.data();
    if (docData.user_id !== uid && !docData.can_access.includes(uid)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const qaSnapshot = await db
      .collection("qa")
      .where("doc_id", "==", docId)
      .orderBy("created_at", "asc")
      .get();

    if (qaSnapshot.empty) {
      return res.status(StatusCodes.OK).json([]);
    }

    const qas = qaSnapshot.docs.map((doc) => ({
      ...doc.data(),
      created_at: convertTimestampToDateString(doc.data().created_at),
    }));
    res.status(StatusCodes.OK).json(qas);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = {
  shareDocument,
  updateDocumentCategory,
  downloadLatexCode,
  documentQA,
  getDocumentQAs,
};
