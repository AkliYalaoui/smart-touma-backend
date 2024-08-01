const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const DocumentRouter = require("./routers/DocumentRouter.js");
const CategoryRouter = require("./routers/CategoryRouter.js");
const TemplateRouter = require("./routers/TemplateRouter.js");
const PDFDocRouter = require("./routers/PDFDocRouter.js");
const SearchRouter = require("./routers/SearchRouter.js");

const {config} = require('dotenv');
config();

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATA_URL
});


const PORT = process.env.PORT || 8080;
const app = express();

router.get("/", (_, res) => {
  return res.json({
    "msg" : "Welcome to smart touma backend"
  })
})

router.get("/api", (_, res) => {
  return res.json({
    "msg" : "Welcome to smart touma API"
  })
})

app.use(express.json())
app.use(router);
app.use('/api/documents', DocumentRouter);
app.use('/api/categories', CategoryRouter);
app.use('/api/templates', TemplateRouter);
app.use('/api/pdfdoc', PDFDocRouter);
app.use('/api/search', SearchRouter);

app.listen(PORT, _ => {
  console.log('smart touma API listening on port 8080!')
})