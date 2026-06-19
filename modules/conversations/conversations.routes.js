const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const {
    createConversation, getAgentConversations, getClientConversations, getConversationByPropertyAndClient, deleteConversation,
} = require("./conversations.controller");


router.post("/", verifyJWT, createConversation);

router.get("/agent/:agentId", verifyJWT, getAgentConversations);
router.get("/client/:clientId", verifyJWT, getClientConversations);
router.get("/check/:propertyId/:clientId", verifyJWT, getConversationByPropertyAndClient);


router.delete("/:conversationId", verifyJWT, deleteConversation);

module.exports = router;