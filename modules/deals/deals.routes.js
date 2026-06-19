const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const {
  createDeal,
  getAgentDeals,
  getClientDeals,
  getAllDeals,
  sendProposal,
  respondToProposal,
  getTopRatedAgents,
} = require("./deals.controller");

router.post("/", verifyJWT, createDeal)

router.get("/top-agents", getTopRatedAgents);
router.get("/agent/:agentId", verifyJWT, getAgentDeals);
router.get("/client/:clientId", verifyJWT, getClientDeals);
router.get("/", verifyJWT, getAllDeals);

router.patch("/:dealId/proposal", verifyJWT, sendProposal);
router.patch("/:dealId/respond", verifyJWT, respondToProposal);

module.exports = router;