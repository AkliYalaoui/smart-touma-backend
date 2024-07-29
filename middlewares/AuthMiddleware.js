
const admin = require('firebase-admin');
const {StatusCodes} = require("http-status-codes");
const {config} = require('dotenv');
config();

const verifyTokenAndApiKey = async (req, res, next) => {
    const token = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];

    const devENV = process.env.ENV ==  "dev";
    if (!devENV && !token) {
      return res.status(StatusCodes.FORBIDDEN).json({error : 'A token is required for authentication'});
    }
  
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(StatusCodes.FORBIDDEN).send('Invalid API Key');
    }
  
    try {
      if(!devENV){
        const decodedToken = await admin.auth().verifyIdToken(token.replace('Bearer ', ''));
        req.uid = decodedToken.uid;
      }else{
        req.uid = "QKzka1CihLO393nu765YXJmL00s2";
      }
      return next();
    } catch (error) {
      return res.status(StatusCodes.UNAUTHORIZED).json({error : 'Invalid Token'});
    }
  };
  
  module.exports = verifyTokenAndApiKey;