const { ObjectId } = require("mongodb");

let conversationCollection;
let messageCollection;

const setConversationCollection = (collection) => { conversationCollection = collection; };
const setMessageCollection = (collection) => { messageCollection = collection; };

const getUnreadCountField = (role) => (role === "agent" ? "agentUnreadCount" : "userUnreadCount");

const withUnreadCount = (conversation, role) => {
  const unreadCountField = getUnreadCountField(role);
  return {
    ...conversation,
    unreadCount: conversation[unreadCountField] || conversation.unreadCount || 0,
  };
};

// create / get existing conversation
const createConversation = async (req, res) => {
  try {
    const {
      propertyId, propertyTitle, propertyImage,
      propertyCity, propertyType, propertyPrice, listingType,
      agentId, agentName,
      clientId, clientEmail, clientName,
      firstMessage,
    } = req.body;

    const existing = await conversationCollection.findOne({ propertyId, clientId, agentId });

    if (existing) {
      await messageCollection.insertOne({
        conversationId: existing._id.toString(),
        senderId: clientId,
        senderRole: "user",
        text: firstMessage,
        isRead: false,
        createdAt: new Date(),
      });
      await conversationCollection.updateOne(
        { _id: existing._id },
        {
          $set: { lastMessage: firstMessage, lastMessageAt: new Date() },
          $inc: { agentUnreadCount: 1 },
        }
      );
      return res.send({ success: true, conversationId: existing._id, isNew: false });
    }

    const conversation = {
      propertyId,
      propertyTitle,
      propertyImage: propertyImage || "",
      propertyCity: propertyCity || "",
      propertyType: propertyType || "",
      propertyPrice: propertyPrice || 0,
      listingType: listingType || "buy",
      agentId,
      agentName: agentName || "",
      clientId,
      clientEmail,
      clientName,
      userUnreadCount: 0,
      agentUnreadCount: 1,
      dealStatus: null,
      lastMessage: firstMessage,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    };

    const result = await conversationCollection.insertOne(conversation);
    const conversationId = result.insertedId.toString();

    await messageCollection.insertOne({
      conversationId,
      senderId: clientId,
      senderRole: "user",
      text: firstMessage,
      isRead: false,
      createdAt: new Date(),
    });

    res.send({ success: true, conversationId, isNew: true });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

// get agent conversations
const getAgentConversations = async (req, res) => {
  try {
    const { agentId } = req.params;
    const conversations = await conversationCollection
      .find({ agentId })
      .sort({ lastMessageAt: -1 })
      .toArray();
    res.send({ success: true, data: conversations.map((conversation) => withUnreadCount(conversation, "agent")) });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// get client conversations
const getClientConversations = async (req, res) => {
  try {
    const { clientId } = req.params;
    const conversations = await conversationCollection
      .find({ clientId })
      .sort({ lastMessageAt: -1 })
      .toArray();
    res.send({ success: true, data: conversations.map((conversation) => withUnreadCount(conversation, "user")) });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};


// get conversation by property and client
const getConversationByPropertyAndClient = async (req, res) => {
  try {
    const { propertyId, clientId } = req.params;
    const conversation = await conversationCollection.findOne({ propertyId, clientId });
    res.send({ success: true, data: conversation || null });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// delete conversation
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    await conversationCollection.deleteOne({
      _id: ObjectId.createFromHexString(conversationId),
    });

    // all messages delete
    await messageCollection.deleteMany({ conversationId });

    res.send({ success: true });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const role = req.user?.role;
    const unreadCountField = getUnreadCountField(role);

    // unread count reset 
    await conversationCollection.updateOne(
      { _id: ObjectId.createFromHexString(conversationId) },
      { $set: { [unreadCountField]: 0, unreadCount: 0 } }
    );

    //unread message read 
    await messageCollection.updateMany(
      { conversationId, isRead: false },
      { $set: { isRead: true } }
    );

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};


module.exports = {
  setConversationCollection,
  setMessageCollection,
  createConversation,
  getAgentConversations,
  getClientConversations,
  getConversationByPropertyAndClient,
  deleteConversation,
  markAsRead
};