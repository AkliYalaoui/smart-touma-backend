const express = require('express');
const router = express.Router();
const AuthRouter = require("./routers/AuthRoutes.js")
const {config} = require('dotenv');

config()


const PORT = 8080;
const app = express();

router.get("/", (req, res) => {
  return res.json({
    "msg" : "Welcome to smart touma backend"
  })
})

app.use(router)
app.use('/api/auth', AuthRouter);

app.listen(PORT, _ => {
  console.log('Example app listening on port 8080!')
})