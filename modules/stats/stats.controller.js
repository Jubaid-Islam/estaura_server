const { ObjectId } = require("mongodb");

let userCollection;
let propertyCollection;
let dealCollection;
let transactionCollection;
let notificationCollection;
let conversationCollection;

const setStatsCollections = (collections) => {
  userCollection        = collections.users;
  propertyCollection    = collections.properties;
  dealCollection        = collections.deals;
  transactionCollection = collections.transactions;
  notificationCollection= collections.notifications;
  conversationCollection= collections.conversations;
};

// last 6 months labels
const getLast6Months = () => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const labels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return labels;
};

const getMonthKey = (dateStr) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(dateStr);
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};


// admin
const getAdminOverview = async (req, res) => {
  try {
    const [totalProperties, totalUsers, totalAgents, transactions, pendingProperties] = await Promise.all([
      propertyCollection.countDocuments({ status: "approved" }),
      userCollection.countDocuments({ role: "user" }),
      userCollection.countDocuments({ role: "agent" }),
      transactionCollection.find({}).toArray(),
      propertyCollection.countDocuments({ status: "pending" }),
    ]);

    const totalRevenue = transactions.reduce((s, t) => s + (t.amount || 0), 0);

    res.send({ success: true, data: { totalProperties, totalUsers, totalAgents, totalRevenue, pendingProperties } });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAdminRevenue = async (req, res) => {
  try {
    const transactions = await transactionCollection.find({}).toArray();
    const labels = getLast6Months();

    const buyByMonth  = {};
    const rentByMonth = {};

    transactions.forEach(t => {
      const key = getMonthKey(t.paidAt || t.createdAt);
      if (t.paymentType === "buy") {
        buyByMonth[key]  = (buyByMonth[key]  || 0) + (t.amount || 0);
      } else if (t.paymentType === "rent") {
        rentByMonth[key] = (rentByMonth[key] || 0) + (t.amount || 0);
      }
    });

    res.send({
      success: true,
      data: {
        labels,
        buyRevenue:  labels.map(l => buyByMonth[l]  || 0),
        rentRevenue: labels.map(l => rentByMonth[l] || 0),
      }
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};


const getAdminPropertyStatus = async (req, res) => {
  try {
    const [available, assigned, sold, rented, pending] = await Promise.all([
      propertyCollection.countDocuments({ status: "approved", agentId: { $exists: false } }),
      propertyCollection.countDocuments({ status: "approved", agentId: { $exists: true } }),
      propertyCollection.countDocuments({ status: "sold" }),
      propertyCollection.countDocuments({ status: "rented" }),
      propertyCollection.countDocuments({ status: "pending" }),
    ])

    res.send({ success: true, data: { available, assigned, sold, rented, pending } });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAdminDeals = async (req, res) => {
  try {
    const deals = await dealCollection.find({}).toArray();
    const labels = getLast6Months();

    // deals per month
    const byMonth = {};
    deals.forEach(d => {
      const key = getMonthKey(d.createdAt);
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    // agent performance 
    const agentMap = {};
    deals.forEach(d => {
      if (d.agentId) agentMap[d.agentId] = (agentMap[d.agentId] || 0) + 1;
    });

    const agentIds = Object.keys(agentMap);
    let agentPerformance = [];

    if (agentIds.length > 0) {

      // agentId could be ObjectId string
      const agents = await userCollection.find({
        _id: { $in: agentIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) }
      }).toArray();

      agentPerformance = agents.map(a => ({
        name: a.name || a.email,
        deals: agentMap[a._id.toString()] || 0,
      })).sort((a, b) => b.deals - a.deals);
    }

    res.send({
      success: true,
      data: {
        labels,
        dealsPerMonth: labels.map(l => byMonth[l] || 0),
        agentPerformance,
      }
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAdminPendingList = async (req, res) => {
  try {
    const pending = await propertyCollection
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    res.send({ success: true, data: pending });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};


// agent
const getAgentOverview = async (req, res) => {
  try {
    const { agentId } = req.params;

    // agentId store as string 
    const [assignedProperties, activeDeals, conversations, transactions] = await Promise.all([
      propertyCollection.countDocuments({ agentId: new ObjectId(agentId) }),   // ObjectId
      dealCollection.countDocuments({ agentId, proposalStatus: "accepted" }),  // string
      conversationCollection.countDocuments({ agentId }),                      // string
      transactionCollection.find({ agentId }).toArray(),                       // string
    ]);

    const revenueEarned = transactions.reduce((s, t) => s + (t.amount || 0), 0);

    res.send({ success: true, data: { assignedProperties, activeDeals, conversations, revenueEarned } });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAgentRevenue = async (req, res) => {
  try {
    const { agentId } = req.params;
    // transaction-> agentId string
    const transactions = await transactionCollection.find({ agentId }).toArray();
    const labels = getLast6Months();

    const byMonth = {};
    transactions.forEach(t => {
      const key = getMonthKey(t.paidAt || t.createdAt);
      byMonth[key] = (byMonth[key] || 0) + (t.amount || 0);
    });

    res.send({
      success: true,
      data: { labels, revenue: labels.map(l => byMonth[l] || 0) }
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAgentAssignedPerMonth = async (req, res) => {
  try {
    const { agentId } = req.params;
    // property-> agentId ObjectId
    const properties = await propertyCollection
      .find({ agentId: new ObjectId(agentId) })
      .toArray();

    const labels = getLast6Months();
    const byMonth = {};
    properties.forEach(p => {
      const key = getMonthKey(p.createdAt);
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    res.send({
      success: true,
      data: { labels, assigned: labels.map(l => byMonth[l] || 0) }
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAgentProposalConversion = async (req, res) => {
  try {
    const { agentId } = req.params;
    // deal -> agentId string
    const deals = await dealCollection.find({ agentId }).toArray();

    const counts = { pending: 0, accepted: 0, rejected: 0, none: 0 };
    deals.forEach(d => {
      const s = d.proposalStatus || "none";
      counts[s] = (counts[s] || 0) + 1;
    });

    const total = deals.length;
    const acceptanceRate = total > 0 ? Math.round((counts.accepted / total) * 100) : 0;

    res.send({ success: true, data: { ...counts, total, acceptanceRate } });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAgentDealsPerMonth = async (req, res) => {
  try {
    const { agentId } = req.params;
    // deal -> agentId string
    const deals = await dealCollection
      .find({ agentId, status: "completed" })
      .toArray();

    const labels = getLast6Months();
    const byMonth = {};
    deals.forEach(d => {
      const key = getMonthKey(d.createdAt);
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    res.send({
      success: true,
      data: { labels, deals: labels.map(l => byMonth[l] || 0) }
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getAgentRecentConversations = async (req, res) => {
  try {
    const { agentId } = req.params;
    // conversation -> agentId string
    const conversations = await conversationCollection
      .find({ agentId })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .toArray();

    res.send({ success: true, data: conversations });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};



// user
const getUserOverview = async (req, res) => {
  try {
    const { clientId } = req.params;
    const email = req.user?.email;

    const [activeDeals, pendingProposals, transactions, submittedProperties] = await Promise.all([
      dealCollection.countDocuments({ clientId }),           //  string
      dealCollection.countDocuments({ clientId, proposalStatus: "pending" }),
      transactionCollection.find({ clientId }).toArray(),    // string
      email
        ? propertyCollection.countDocuments({ "submittedBy.email": email })
        : Promise.resolve(0),
    ]);

    const totalPaid = transactions.reduce((s, t) => s + (t.amount || 0), 0);

    res.send({ success: true, data: { activeDeals, pendingProposals, totalPaid, submittedProperties } });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getUserPaymentHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    // clientId string
    const transactions = await transactionCollection.find({ clientId }).toArray();
    const labels = getLast6Months();

    const buyByMonth  = {};
    const rentByMonth = {};

    transactions.forEach(t => {
      const key = getMonthKey(t.paidAt || t.createdAt);
      if (t.paymentType === "buy") {
        buyByMonth[key]  = (buyByMonth[key]  || 0) + (t.amount || 0);
      } else {
        rentByMonth[key] = (rentByMonth[key] || 0) + (t.amount || 0);
      }
    });

    res.send({
      success: true,
      data: {
        labels,
        buyPayments:  labels.map(l => buyByMonth[l]  || 0),
        rentPayments: labels.map(l => rentByMonth[l] || 0),
      }
    });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getUserDealProgress = async (req, res) => {
  try {
    const { clientId } = req.params;
    const deals = await dealCollection
      .find({ clientId })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({ success: true, data: deals });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getUserPropertyTypeDistribution = async (req, res) => {
  try {
    const { clientId } = req.params;
    const deals = await dealCollection.find({ clientId }).toArray();

    const buy  = deals.filter(d => d.listingType === "buy").length;
    const rent = deals.filter(d => d.listingType === "rent").length;

    res.send({ success: true, data: { buy, rent, total: deals.length } });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

const getUserSubmittedProperties = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).send({ success: false, message: "Unauthorized" });

    const properties = await propertyCollection
      .find({ "submittedBy.email": email })
      .sort({ createdAt: -1 })
      .limit(4)
      .toArray();

    res.send({ success: true, data: properties });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  setStatsCollections,
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
};