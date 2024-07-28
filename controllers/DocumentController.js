const admin = require('firebase-admin');
const {StatusCodes} = require("http-status-codes");

const getDocuments =  async (req, res) => {
    try {
        const db = admin.firestore();
        const documentsRef = db.collection('documents');
        const snapshot = await documentsRef.where('user_id', '==', "fefzfjzéf").get();

        const document_data = [];
        if (snapshot.empty) {
          console.log('No matching documents.');
        }  
        snapshot.forEach(doc => document_data.push(doc.data()));
        res.status(StatusCodes.OK).json(document_data);
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).send(error.message);
    }
};

const processImages =  async (req, res) => {
    try {
        const db = admin.firestore();
        const data = req.body;
        const docRef = await db.collection('documents').add(data);
        res.status(StatusCodes.CREATED).json({ id: docRef.id });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).send(error.message);
    }
};


module.exports = {getDocuments, processImages};

