const stripe = require("../../config/stripe");

// create payment intent 
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "usd", metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).send({ success: false, message: "Valid amount is required" })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),    // cents convert
      currency,
      metadata, 
    });

    res.send({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).send({ success: false, error: error.message })
  }
};

module.exports = { createPaymentIntent };