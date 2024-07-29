const admin = require("firebase-admin");
const fs = require("fs");
const {
  model,
  fileToGenerativePart,
  pdf_prompt,
  parseLatexResponse,
} = require("../gemini.js");
const { StatusCodes } = require("http-status-codes");
const latex = require("latex");
const tmp = require("tmp");

const getDocuments = async (req, res) => {
  try {
    const uid = req.uid;
    if (!uid) throw new Error("UID is required");
    const { pageSize = 10, pageToken } = req.query;
    const db = admin.firestore();
    const documentsRef = db.collection("documents").where("user_id", "==", uid);

    let query = documentsRef.limit(parseInt(pageSize));

    if (pageToken) {
      const snapshot = await documentsRef.doc(pageToken).get();
      if (!snapshot.exists) {
        throw new Error("Invalid page token");
      }
      query = query.startAfter(snapshot);
    }

    const snapshot = await query.get();
    const documents = [];
    let lastVisible = null;
    snapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
      lastVisible = doc;
    });

    const nextPageToken = lastVisible ? lastVisible.id : null;
    res.status(StatusCodes.OK).json({ documents, nextPageToken });
  } catch (error) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: error.message });
  }
};

const addDocument = async (req, res) => {
  try {
    // Process uploaded files
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
    const pdfTemplate_id = req.body.template_id || "xsgiPJZWr9iN8BViMQb7";
    const snapshot = await db.collection("templates").doc(pdfTemplate_id).get();
    if (snapshot.empty) {
      throw new Error("No matching template");
    }
    const template_name = snapshot.data().name;
    const result = await model.generateContent([
      pdf_prompt(template_name),
      ...imageParts,
    ]);
    const response = await result.response;
    const llmResponse = response.text();

    const { title, latexCode } = parseLatexResponse(llmResponse);

    const data = {
      title: req.body.title || title,
      latex_code: latexCode,
      template: db.doc("templates/" + pdfTemplate_id),
      user_id: req.uid,
      category: db.doc("categories/SqdgDc0KvcLNbf7eD90i"),
      can_access: [],
    };

    await db.collection("documents").add(data);
    // Generate PDF from LaTeX code
    const pdfStream = latex(latexCode);
    const tmpFile = tmp.fileSync({ postfix: ".pdf" });

    pdfStream
      .pipe(fs.createWriteStream(tmpFile.name))
      .on("finish", () => {
        res.status(StatusCodes.CREATED).sendFile(tmpFile.name, (err) => {
          if (err) {
            console.error("Error sending file:", err);
            res
              .status(StatusCodes.INTERNAL_SERVER_ERROR)
              .json({ error: "Error sending file" });
          }

          // Clean up temporary file
          fs.unlink(tmpFile.name, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            }
          });
        });
      })
      .on("error", (err) => {
        console.error("Error generating PDF:", err);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Error generating PDF" });
      });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).send({ error: error.message });
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

    const { name, latex_code, title, user_id, can_ccess } = docSnapshot.data();
    if (user_id != uid && !can_ccess.includes(uid)) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Document Is PRIVATE" });
    }

    const result = await model.generateContent([
      update_pdf_prompt(name, user_prompt, title, latex_code),
    ]);
    const response = await result.response;
    const llmResponse = response.text();
    const parsed_res = parseLatexResponse(llmResponse);

    await docRef.update({
      title: parsed_res.title,
      latex_code: parsed_res.latexCode,
    });

    res
      .status(StatusCodes.OK)
      .json({ message: "Document updated successfully" });
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

    const { user_id, can_ccess } = docSnapshot.data();
    if (user_id != uid && !can_ccess.includes(uid)) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Document Is PRIVATE" });
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
  addDocument,
  updateDocument,
  deleteDocument,
};
