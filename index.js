const express = require("express")
require("dotenv").config()
const cors = require("cors")
const cookieParser = require("cookie-parser")

const app = express()
const port = process.env.PORT || 3000

const connectDB = require("./config/db")
const userRoutes = require("./modules/user/user.routes")
const integrationRoutes = require("./modules/integration/integration.routes")
const { setUserCollection } = require("./modules/user/user.controller")
const { setIntegrationCollection, setDataCollection } = require("./modules/integration/integration.controller")
const { setPropertyCollection } = require("./modules/property/property.controller")
const propertyRoutes = require("./modules/property/property.routes.js")
const notificationsRoutes = require("./modules/notifications/notifications.routes.js")
const { setNotificationCollection } = require("./modules/notifications/notifications.controller.js")
const { setNotificationCollection: setHelperCollection } = require("./modules/notifications/notificationsHelper");
const conversationRoutes = require("./modules/conversations/conversations.routes");
const messageRoutes = require("./modules/messages/messages.routes");

const { setConversationCollection, setMessageCollection: setMsgCollInConv } = require("./modules/conversations/conversations.controller");
const { setMessageCollection, setConversationCollection: setConvCollInMsg, setDealCollection: setDealCollInMsg } = require("./modules/messages/messages.controller");

const dealRoutes = require("./modules/deals/deals.routes");
const { setDealCollection } = require("./modules/deals/deals.controller");

const paymentRoutes = require("./modules/payments/payments.routes");
const transactionRoutes = require("./modules/transactions/transactions.routes");
const rentScheduleRoutes = require("./modules/rent-schedules/rent-schedules.routes");

const {
  setTransactionCollection,
  setDealCollection: setDealInTxn,
  setPropertyCollection: setPropInTxn,
} = require("./modules/transactions/transactions.controller");

const { setRentScheduleCollection } = require("./modules/rent-schedules/rent-schedules.controller");

const statsRoutes = require("./modules/stats/stats.routes");
const { setStatsCollections } = require("./modules/stats/stats.controller");

const agentApplicationRoutes = require("./modules/agent-applications/agent-applications.routes")
const {
  setApplicationCollection,
  setUserCollection: setUserInApplications,
} = require("./modules/agent-applications/agent-applications.controller");


app.use(
  cors({
    origin: process.env.CLIENT_URL.split(','),
    credentials: true,
  })
);
app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send(" Server Running")
})

// main function
async function startServer() {
  try {
    const client = await connectDB()
    const database = client.db("estaura")


    // collection
    const userCollection = database.collection("users")
    setUserCollection(userCollection)

    const integrationCollection = database.collection("integrations")
    setIntegrationCollection(integrationCollection)

    const dataCollection = database.collection("data")
    setDataCollection(dataCollection)

    const propertyCollection = database.collection("properties");
    setPropertyCollection(propertyCollection);

    const notificationCollection = database.collection("notifications");
    setNotificationCollection(notificationCollection);
    setHelperCollection(notificationCollection);

    await notificationCollection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 60 * 60 * 24 * 90 }
    ); 

    const conversationCollection = database.collection("conversations");
    setConversationCollection(conversationCollection);
    setConvCollInMsg(conversationCollection)

    const messageCollection = database.collection("messages");
    setMessageCollection(messageCollection);
    setMsgCollInConv(messageCollection);

    const dealCollection = database.collection("deals");
    setDealCollection(dealCollection);
    setDealCollInMsg(dealCollection);


    const transactionCollection = database.collection("transactions");
    setTransactionCollection(transactionCollection);
    setDealInTxn(dealCollection);
    setPropInTxn(propertyCollection);


    const rentScheduleCollection = database.collection("rent_schedules");
    setRentScheduleCollection(rentScheduleCollection);

    const applicationCollection = database.collection("agent_applications");
    setApplicationCollection(applicationCollection);
    setUserInApplications(userCollection);


    setStatsCollections({
      users: userCollection,
      properties: propertyCollection,
      deals: dealCollection,
      transactions: transactionCollection,
      notifications: notificationCollection,
      conversations: conversationCollection,
    });

    // routes
    app.use("/users", userRoutes)
    app.use("/integration", integrationRoutes)
    app.use("/property", propertyRoutes)
    app.use("/notifications", notificationsRoutes);
    app.use("/conversations", conversationRoutes);
    app.use("/messages", messageRoutes);
    app.use("/deals", dealRoutes);
    app.use("/payments", paymentRoutes);
    app.use("/transactions", transactionRoutes);
    app.use("/rent-schedules", rentScheduleRoutes);
    app.use("/stats", statsRoutes);
    app.use("/agent-applications", agentApplicationRoutes);



    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
  }
}
startServer()