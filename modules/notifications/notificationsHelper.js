let notificationCollection;

const setNotificationCollection = (collection) => {
  notificationCollection = collection;
};


const createNotification = async ({
  recipientId,
  recipientRole,
  type,
  message,
  propertyId = null,
  propertyImage = null,
}) => {
  try {
    await notificationCollection.insertOne({
      recipientId,
      recipientRole,
      type,
      message,
      propertyId,
      propertyImage,
      isRead: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Notification creation failed:", error.message);
  }
};

module.exports = { setNotificationCollection, createNotification };