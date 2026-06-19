const { ObjectId } = require("mongodb");
const { createNotification } = require("../notifications/notificationsHelper");

let dealCollection;

const setDealCollection = (collection) => {
  dealCollection = collection;
};

// create deal when deal_closed
const createDeal = async (req, res) => {
  try {
    const {
      propertyId, propertyTitle, propertyImage, propertyCity, propertyType, propertyPrice, listingType, agentId, clientId, clientEmail, conversationId, 
    } = req.body;

    const existing = await dealCollection.findOne({ propertyId, clientId, agentId });
    if (existing) {
      return res.send({ success: true, dealId: existing._id, isNew: false });
    }

    const deal = {
      propertyId,
      propertyTitle,
      propertyImage: propertyImage || "",
      propertyCity: propertyCity || "",
      propertyType: propertyType || "",
      propertyPrice: propertyPrice || 0,
      listingType: listingType || "buy",
      agentId,
      clientId,
      clientEmail,
      conversationId,
      proposalStatus: "none", 
      proposalNote: "",
      status: "active",
      createdAt: new Date(),
    };

    const result = await dealCollection.insertOne(deal);

    // notify client
    await createNotification({
      recipientId: clientEmail,
      recipientRole: "user",
      type: "deal_closed",
      message: `A deal has been closed for "${propertyTitle}". Check your deals section.`,
      propertyId,
      propertyImage: propertyImage || "",
    });

    res.send({ success: true, dealId: result.insertedId, isNew: true });
  } catch (error) {
    console.error("Create deal error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

// get agent deals
const getAgentDeals = async (req, res) => {
  try {
    const { agentId } = req.params;
    const deals = await dealCollection
      .find({ agentId })
      .sort({ createdAt: -1 })
      .toArray();
    res.send({ success: true, data: deals });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// get client deals
const getClientDeals = async (req, res) => {
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

// get all deals (admin)
const getAllDeals = async (req, res) => {
  try {
    const deals = await dealCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.send({ success: true, data: deals });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// send proposal (agent)
const sendProposal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { proposalNote, agentName } = req.body;

    const deal = await dealCollection.findOne({ _id: new ObjectId(dealId) });
    if (!deal) return res.status(404).send({ success: false, message: "Deal not found" });

    await dealCollection.updateOne(
      { _id: new ObjectId(dealId) },
      {
        $set: {
          proposalStatus: "pending",
          proposalNote: proposalNote || "",
          proposalSentAt: new Date(),
        }
      }
    );

    // notify client
    await createNotification({
      recipientId: deal.clientEmail,
      recipientRole: "user",
      type: "proposal_received",
      message: `You have a new proposal for "${deal.propertyTitle}" from ${agentName || "your agent"}.`,
      propertyId: deal.propertyId,
      propertyImage: deal.propertyImage,
    });

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// respond to proposal (client)
const respondToProposal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { response, clientName } = req.body;        // accepted / rejected

    const deal = await dealCollection.findOne({ _id: new ObjectId(dealId) });
    if (!deal) return res.status(404).send({ success: false, message: "Deal not found" });

    await dealCollection.updateOne(
      { _id: new ObjectId(dealId) },
      { $set: { proposalStatus: response, respondedAt: new Date() } }
    );

    // notify agent
    await createNotification({
      recipientId: deal.agentId,
      recipientRole: "agent",
      type: response === "accepted" ? "proposal_accepted" : "proposal_rejected",
      message: `${clientName || "Client"} has ${response} your proposal for "${deal.propertyTitle}".`,
      propertyId: deal.propertyId,
      propertyImage: deal.propertyImage,
    });

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// get top rated agents by deals closed
const getTopRatedAgents = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$agentId",
          dealsClosed: { $sum: 1 },
          totalRevenue: { $sum: { $toDouble: { $ifNull: ["$propertyPrice", 0] } } },
          latestDeal: { $max: "$createdAt" },
        },
      },
      { $sort: { dealsClosed: -1 } },
      {
        $addFields: {
          agentObjId: {
            $convert: { input: "$_id", to: "objectId", onError: null, onNull: null },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "agentObjId",
          foreignField: "_id",
          as: "agentInfo",
        },
      },
      { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          agentId: "$_id",
          dealsClosed: 1,
          totalRevenue: 1,
          latestDeal: 1,
          name: { $ifNull: ["$agentInfo.name", "Unknown Agent"] },
          email: { $ifNull: ["$agentInfo.email", ""] },
          photo: { $ifNull: ["$agentInfo.photo", ""] },
        },
      },
    ];

    const agents = await dealCollection.aggregate(pipeline).toArray();
    res.send({ success: true, data: agents });
  } catch (error) {
    console.error("Top-rated agents error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};


module.exports = {
  setDealCollection,
  createDeal,
  getAgentDeals,
  getClientDeals,
  getAllDeals,
  sendProposal,
  respondToProposal,
  getTopRatedAgents,
};
