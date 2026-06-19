const { createNotification } = require("../notifications/notificationsHelper");

let transactionCollection;
const setTransactionCollection = (collection) => { transactionCollection = collection }

let dealCollection
const setDealCollection = (collection) => { dealCollection = collection }

let propertyCollection
const setPropertyCollection = (collection) => { propertyCollection = collection }


// unique transaction ref generate
const generateTxnRef = () => {
  const date = new Date();
  const year = date.getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TXN-${year}-${rand}`;
};

// create transaction
const createTransaction = async (req, res) => {
  try {
    const {
      dealId,
      propertyId, propertyTitle,
      propertyImage,
      paymentType,          // buy/ rent
      agentId,
      clientId, clientEmail,
      amount,
      month,               // for rent and buy- null
      stripePaymentId,
      agentName,
    } = req.body

    const transaction = {
      transactionRef: generateTxnRef(),
      dealId,
      propertyId, propertyTitle,
      propertyImage,
      paymentType,
      agentId,
      clientId, clientEmail,
      amount: Number(amount),
      month: month || null,
      stripePaymentId,
      status: "completed",
      paidAt: new Date(),
      createdAt: new Date(),
    };

    const result = await transactionCollection.insertOne(transaction)


    if (paymentType === "buy") {
      if (dealCollection) {
        await dealCollection.updateOne(
          { _id: require("mongodb").ObjectId.createFromHexString(dealId) },
          { $set: { status: "completed", proposalStatus: "completed" } }
        );
      }
      if (propertyCollection) {
        await propertyCollection.updateOne(
          { _id: require("mongodb").ObjectId.createFromHexString(propertyId) },
          { $set: { status: "sold" } }
        )
      }
    }

    // notify agent
    await createNotification({
      recipientId: agentId,
      recipientRole: "agent",
      type: "payment_completed",
      message: `Payment received for "${propertyTitle}" — $${Number(amount).toLocaleString()}`,
      propertyId,
      propertyImage,
    });

    // notify admin
    await createNotification({
      recipientId: "admin",
      recipientRole: "admin",
      type: "payment_completed",
      message: `Payment completed: "${propertyTitle}" by ${clientEmail} — $${Number(amount).toLocaleString()}`,
      propertyId,
      propertyImage,
    });

    res.send({ success: true, transactionId: result.insertedId, data: transaction });
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).send({ success: false, error: error.message })
  }
}

// get client transactions 
const getClientTransactions = async (req, res) => {
  try {
    const { clientId } = req.params
    const transactions = await transactionCollection
      .find({ clientId })
      .sort({ paidAt: -1 })
      .toArray()
    res.send({ success: true, data: transactions })
  } catch (error) {
    res.status(500).send({ success: false, error: error.message })
  }
}

// get agent transactions
const getAgentTransactions = async (req, res) => {
  try {
    const { agentId } = req.params
    const transactions = await transactionCollection
      .find({ agentId })
      .sort({ paidAt: -1 })
      .toArray()
    res.send({ success: true, data: transactions })
  } catch (error) {
    res.status(500).send({ success: false, error: error.message })
  }
}

// get all transactions for admin 
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await transactionCollection
      .find({})
      .sort({ paidAt: -1 })
      .toArray()

    // revenue summary
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const buyRevenue = transactions.filter(t => t.paymentType === "buy").reduce((sum, t) => sum + t.amount, 0);
    const rentRevenue = transactions.filter(t => t.paymentType === "rent").reduce((sum, t) => sum + t.amount, 0);

    res.send({
      success: true,
      data: transactions,
      summary: { totalRevenue, buyRevenue, rentRevenue }
    })
  } catch (error) {
    res.status(500).send({ success: false, error: error.message })
  }
};

module.exports = {
  setTransactionCollection,
  setDealCollection,
  setPropertyCollection,
  createTransaction,
  getClientTransactions,
  getAgentTransactions,
  getAllTransactions,
}