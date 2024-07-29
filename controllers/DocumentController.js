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
    const db = admin.firestore();
    const documentsRef = db.collection("documents");
    const snapshot = await documentsRef.where("user_id", "==", uid).get();

    const document_data = [];
    if (snapshot.empty) {
      console.log("No matching documents.");
    }
    snapshot.forEach((doc) => document_data.push(doc.data()));
    res.status(StatusCodes.OK).json(document_data);
  } catch (error) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: error.message });
  }
};

const processImages = async (req, res) => {
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

    const docRef = await db.collection("documents").add(data);
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
              .json({error : "Error sending file"});
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
          .json({error:"Error generating PDF"});
      });

  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).send({ error: error.message });
  }
};

module.exports = { getDocuments, processImages };
