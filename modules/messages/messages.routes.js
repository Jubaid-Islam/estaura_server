const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const { getMessages, sendMessage, markMessagesRead, updateDealStatus } = require("./messages.controller");

router.get("/:conversationId", verifyJWT, getMessages);
router.post("/:conversationId", verifyJWT, sendMessage);
router.patch("/read/:conversationId", verifyJWT, markMessagesRead);
router.patch("/deal-status/:conversationId", verifyJWT, updateDealStatus);

module.exports = router;