let notificationCollection;

const setNotificationCollection = (collection) => {
  notificationCollection = collection;
};

// get notifications
const getNotifications = async (req, res) => {
  try {
    const { recipientId, recipientRole } = req.params;
    const notifications = await notificationCollection
      .find({ recipientId, recipientRole })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({ success: true, data: notifications });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// mark all as read for a recipient
const markAllRead = async (req, res) => {
  try {
    const { recipientId, recipientRole } = req.params;
    await notificationCollection.updateMany(
      { recipientId, recipientRole, isRead: false },
      { $set: { isRead: true } }
    );
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// mark single notification as read
const markOneRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { ObjectId } = require("mongodb");
    await notificationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRead: true } }
    );
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  setNotificationCollection,
  getNotifications,
  markAllRead,
  markOneRead,
};
