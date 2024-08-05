const admin = require("firebase-admin");
const fs = require("fs");
const pdf = require("../utils/pdf.js");
const {convertTimestampToDateString} = require("../utils/dates.js");

const {
  model,
  fileToGenerativePart,
  pdf_prompt,
  update_pdf_prompt,
  parseLatexResponse,
  genAI
} = require("../gemini.js");
const { StatusCodes } = require("http-status-codes");
const { create } = require("domain");

const getDocuments = async (req, res) => {
  try {
    const uid = req.uid;
    if (!uid) throw new Error("UID is required");

    const { pageSize = 10, pageToken } = req.query;
    const db = admin.firestore();
    const documentsRef = db.collection("documents").where("user_id", "==", uid);

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
      const templateName = templateDoc.exists ? templateDoc.data().name : "Unknown Template";
      const categoryDoc = await docData.category?.get();
      const categoryName = categoryDoc?.exists ? categoryDoc.data().name : "Unknown Category";

      documents.push({
        id: doc.id,
        ...docData,
        template: templateName,
        category: categoryName,
        created_at : convertTimestampToDateString(docData.created_at),
        embedding: []
      });
      lastVisible = doc;
    }

    const nextPageToken = lastVisible ? lastVisible.id : null;
    res.status(StatusCodes.OK).json({ documents, nextPageToken });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const getSharedDocuments = async (req, res) => {
  try {
    const uid = req.uid;
    if (!uid) throw new Error("UID is required");

    const { pageSize = 10, pageToken } = req.query;
    const db = admin.firestore();
    const documentsRef = db.collection("documents").where("can_access", "array-contains", uid);

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
      const templateName = templateDoc.exists ? templateDoc.data().name : "Unknown Template";
      const categoryDoc = await docData.category?.get();
      const categoryName = categoryDoc?.exists ? categoryDoc.data().name : "Unknown Category";

      documents.push({
        id: doc.id,
        ...docData,
        template: templateName,
        category: categoryName,
        created_at : convertTimestampToDateString(docData.created_at),
        embedding: []
      });
      lastVisible = doc;
    }

    const nextPageToken = lastVisible ? lastVisible.id : null;
    res.status(StatusCodes.OK).json({ documents, nextPageToken });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};


const getDocumentById = async (req, res) => {
  try {
    const uid = req.uid;
    const { docId } = req.params;
    const db = admin.firestore();

    if (!docId) throw new Error("Document ID is required");

    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const { latex_code, user_id, can_access } = docSnapshot.data();
    if (user_id !== uid && !can_access.includes(uid)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const { pdfFilePath, cleanupCallback } = await pdf.generate(latex_code);

    res.status(StatusCodes.OK).sendFile(pdfFilePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Error sending file" });
      }
      cleanupCallback();
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const addDocument = async (req, res) => {
  try {
    if (!req.files) throw new Error("Must upload at least one image");

    const imageParts = [];
    req.files.forEach((file) => {
      imageParts.push(fileToGenerativePart(file.path, file.mimetype));
      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`Error deleting file ${file.path}`, err);
        }
      });
    });

    const db = admin.firestore();
    const pdfTemplate_id = req.body.template_id || "PnpQ1GQd7f9IjUmkFLj0";
    const snapshot = await db.collection("templates").doc(pdfTemplate_id).get();
    if (!snapshot.exists) {
      throw new Error("No matching template");
    }

    const template_name = snapshot.data().name;
    const result = await model.generateContent([
      pdf_prompt(template_name),
      ...imageParts,
    ]);

    const response = await result.response;
    const llmResponse = await response.text();

    const { title, latexCode } = parseLatexResponse(llmResponse);
    const updated_title = req.body.title || title;

    const em_model = genAI.getGenerativeModel({ model: "text-embedding-004"});
    const plain_text = pdf.extractPlainText(latexCode);
    const em_result = await em_model.embedContent([updated_title, plain_text]);
    const embedding = em_result.embedding.values;

    const data = {
      title: updated_title,
      latex_code: latexCode,
      template: db.doc("templates/" + pdfTemplate_id),
      user_id: req.uid,
      category: null,
      can_access: [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      embedding : admin.firestore.FieldValue.vector(embedding)
    };

    await db.collection("documents").add(data);

    // Generate PDF from LaTeX code
    const { pdfFilePath, cleanupCallback } = await pdf.generate(latexCode);

    res.status(StatusCodes.CREATED).sendFile(pdfFilePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Error sending file" });
      }
      cleanupCallback();
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const uid = req.uid;
    const { docId } = req.params;
    const db = admin.firestore();
    const { user_prompt } = req.body;

    if (!docId) throw new Error("Document ID is required");

    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const { name, latex_code, title, user_id, can_access } = docSnapshot.data();
    if (user_id !== uid && !can_access.includes(uid)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    const result = await model.generateContent([
      update_pdf_prompt(name, user_prompt, title, latex_code),
    ]);
    const response = await result.response;
    const llmResponse = await response.text();
    const parsed_res = parseLatexResponse(llmResponse);

    const em_model = genAI.getGenerativeModel({ model: "text-embedding-004"});
    const plain_text = pdf.extractPlainText(parsed_res.latexCode);
    const em_result = await em_model.embedContent([parsed_res.title, plain_text]);
    const embedding = em_result.embedding.values;

    await docRef.update({
      title: parsed_res.title,
      latex_code: parsed_res.latexCode,
      embedding : admin.firestore.FieldValue.vector(embedding)
    });

    const { pdfFilePath, cleanupCallback } = await pdf.generate(
      parsed_res.latexCode
    );
    res.status(StatusCodes.OK).sendFile(pdfFilePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Error sending file" });
      }
      cleanupCallback();
    });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const uid = req.uid;
    const { docId } = req.params;
    const db = admin.firestore();

    if (!docId) throw new Error("Document ID is required");

    const docRef = db.collection("documents").doc(docId);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Document not found" });
    }

    const { user_id, can_access } = docSnapshot.data();
    if (user_id !== uid && !can_access.includes(uid)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    await docRef.delete();
    res
      .status(StatusCodes.OK)
      .json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

module.exports = {
  getDocuments,
  getSharedDocuments,
  getDocumentById,
  addDocument,
  updateDocument,
  deleteDocument,
};
