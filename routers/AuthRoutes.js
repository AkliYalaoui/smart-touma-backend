const router = require("express").Router();
const {StatusCodes} = require("http-status-codes");

router.get("/login",  (req,res) => {
    console.log('/' + req.method);
    res.json({
        "msg" : "Hello world"
    }).status(StatusCodes.OK)
  });

module.exports = router;