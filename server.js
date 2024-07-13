const express = require('express');
const AuthRouter = require("./routers/AuthRoutes.js")
const {config} = require('dotenv');

config()


const PORT = 8080;
const app = express();

app.use('/api/auth', AuthRouter);

app.listen(PORT, _ => {
  console.log('Example app listening on port 8080!')
})