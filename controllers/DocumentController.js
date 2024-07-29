const admin = require('firebase-admin');
const fs = require('fs');
const {model, fileToGenerativePart, PDFprompt} = require("../gemini.js");
const {StatusCodes} = require("http-status-codes");

const getDocuments =  async (req, res) => {
    try {
        const uid = req.uid;
        if (!uid)
            throw new Error("UID is required");
        const db = admin.firestore();
        const documentsRef = db.collection('documents');
        const snapshot = await documentsRef.where('user_id', '==', uid).get();

        const document_data = [];
        if (snapshot.empty) {
          console.log('No matching documents.');
        }  
        snapshot.forEach(doc => document_data.push(doc.data()));
        res.status(StatusCodes.OK).json(document_data);
    } catch (error) {
      res.status(StatusCodes.UNAUTHORIZED).json({error : error.message});
    }
};

const processImages =  async (req, res) => {
    try {
        // Process uploaded files
        if (!req.files) 
            throw new Error("Must upload at least one image")
            
        const imageParts = [];
        req.files.forEach(file => {
            imageParts.push(fileToGenerativePart(file.path, file.mimetype));
            fs.unlink(file.path, err => {
              if (err) {
                console.error(`Error deleting file ${file.path}`, err);
              }
            });
          });

        console.log(imageParts);
        const result = await model.generateContent([PDFprompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        console.log(text);

        const db = admin.firestore();
        const data = {
            title : "",
            latex_code : text,
            name : "",
            template : "",
            user_id : req.uid,
            category : db.doc("categories/SqdgDc0KvcLNbf7eD90i"),
            can_access : []
        };

        const docRef = await db.collection('documents').add(data);
        console.log(docRef);
        res.status(StatusCodes.CREATED).json({ id: docRef.id });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).send({error : error.message});
    }
};


module.exports = {getDocuments, processImages};

