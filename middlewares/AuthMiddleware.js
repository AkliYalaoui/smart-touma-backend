
const admin = require('firebase-admin');
const {config} = require('dotenv');
config();

const verifyTokenAndApiKey = async (req, res, next) => {
    const token = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];
  
    if (!token) {
      return res.status(403).send('A token is required for authentication');
    }
  
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(403).send('Invalid API Key');
    }
  
    try {
      const decodedToken = await admin.auth().verifyIdToken(token.replace('Bearer ', ''));
      req.user = decodedToken;
      return next();
    } catch (error) {
      return res.status(401).send('Invalid Token');
    }
  };
  
  module.exports = verifyTokenAndApiKey;