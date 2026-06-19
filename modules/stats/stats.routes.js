const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const verifyAgent = require("../../middlewares/verifyAgent");

const {
  getAdminOverview,
  getAdminRevenue,
  getAdminPropertyStatus,
  getAdminDeals,
  getAdminPendingList,
  getAgentOverview,
  getAgentRevenue,
  getAgentAssignedPerMonth,
  getAgentProposalConversion,
  getAgentDealsPerMonth,
  getAgentRecentConversations,
  getUserOverview,
  getUserPaymentHistory,
  getUserDealProgress,
  getUserPropertyTypeDistribution,
  getUserSubmittedProperties,
} = require("./stats.controller");

// admin
router.get("/admin/overview",       verifyJWT, verifyAdmin, getAdminOverview);
router.get("/admin/revenue",        verifyJWT, verifyAdmin, getAdminRevenue);
router.get("/admin/property-status",verifyJWT, verifyAdmin, getAdminPropertyStatus);
router.get("/admin/deals",          verifyJWT, verifyAdmin, getAdminDeals);
router.get("/admin/pending-list",   verifyJWT, verifyAdmin, getAdminPendingList);

// agent
router.get("/agent/:agentId/overview",           verifyJWT, verifyAgent, getAgentOverview);
router.get("/agent/:agentId/revenue",            verifyJWT, verifyAgent, getAgentRevenue);
router.get("/agent/:agentId/assigned-per-month", verifyJWT, verifyAgent, getAgentAssignedPerMonth);
router.get("/agent/:agentId/proposal-conversion",verifyJWT, verifyAgent, getAgentProposalConversion);
router.get("/agent/:agentId/deals-per-month",    verifyJWT, verifyAgent, getAgentDealsPerMonth);
router.get("/agent/:agentId/recent-conversations",verifyJWT, verifyAgent, getAgentRecentConversations);

// user
router.get("/user/:clientId/overview",             verifyJWT, getUserOverview);
router.get("/user/:clientId/payment-history",      verifyJWT, getUserPaymentHistory);
router.get("/user/:clientId/deal-progress",        verifyJWT, getUserDealProgress);
router.get("/user/:clientId/property-type",        verifyJWT, getUserPropertyTypeDistribution);
router.get("/user/:clientId/submitted-properties", verifyJWT, getUserSubmittedProperties);

module.exports = router;