const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const { createTransaction, getClientTransactions, getAgentTransactions, getAllTransactions,
} = require("./transactions.controller");

router.post("/", verifyJWT, createTransaction)

router.get("/client/:clientId", verifyJWT, getClientTransactions)
router.get("/agent/:agentId", verifyJWT, getAgentTransactions)
router.get("/", verifyJWT, getAllTransactions)

module.exports = router