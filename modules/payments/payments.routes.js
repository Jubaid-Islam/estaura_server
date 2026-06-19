const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const { createPaymentIntent } = require("./payments.controller");

router.post("/create-intent", verifyJWT, createPaymentIntent)

module.exports = router