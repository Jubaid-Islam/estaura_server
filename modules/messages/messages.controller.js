const { createNotification } = require("../notifications/notificationsHelper");

let messageCollection;
let conversationCollection;
let dealCollection;

const setMessageCollection = (collection) => { messageCollection = collection; };
const setConversationCollection = (collection) => { conversationCollection = collection; };
const setDealCollection = (collection) => { dealCollection = collection; };

// get messages
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await messageCollection
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();
    res.send({ success: true, data: messages });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// send message
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const {
      senderId, senderRole, text,
      recipientId, recipientRole,
      propertyTitle, propertyImage, propertyId, senderName,
    } = req.body;

    if (!text?.trim()) {
      return res.status(400).send({ success: false, message: "Message text is required" });
    }

    const message = {
      conversationId,
      senderId,
      senderRole,
      text: text.trim(),
      isRead: false,
      createdAt: new Date(),
    };

    const result = await messageCollection.insertOne(message);

    await conversationCollection.updateOne(
      { _id: require("mongodb").ObjectId.createFromHexString(conversationId) },
      { $set: { lastMessage: text.trim(), lastMessageAt: new Date() } }
    );

    await createNotification({
      recipientId,
      recipientRole,
      type: "new_message",
      message: `New message from ${senderName} about "${propertyTitle}"`,
      propertyId,
      propertyImage,
    });

    res.send({ success: true, data: { ...message, _id: result.insertedId } });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

// update deal status in conversation
const updateDealStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const {
      dealStatus,
      propertyId, propertyTitle, propertyImage,
      propertyCity, propertyType, propertyPrice, listingType,
      agentId, clientId, clientEmail,
    } = req.body;

    // update dela status in conversations
    await conversationCollection.updateOne(
      { _id: require("mongodb").ObjectId.createFromHexString(conversationId) },
      { $set: { dealStatus, dealStatusUpdatedAt: new Date() } }
    );

    // deal_closed -> create entry in deals collection 
    if (dealStatus === "deal_closed" && dealCollection) {
      const existing = await dealCollection.findOne({ propertyId, clientId, agentId });
      if (!existing) {
        await dealCollection.insertOne({
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
        });

        // notify client
        await createNotification({
          recipientId: clientEmail,
          recipientRole: "user",
          type: "deal_closed",
          message: `A deal has been closed for "${propertyTitle}". Check your deals section.`,
          propertyId,
          propertyImage: propertyImage || "",
        });
      }
    }

    res.send({ success: true });
  } catch (error) {
    console.error("Update deal status error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

// mark messages as read 
const markMessagesRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { recipientId } = req.body;
    await messageCollection.updateMany(
      { conversationId, senderId: { $ne: recipientId }, isRead: false },
      { $set: { isRead: true } }
    );
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  setMessageCollection,
  setConversationCollection,
  setDealCollection,
  getMessages,
  sendMessage,
  updateDealStatus,
  markMessagesRead,
};