const admin = require('../config/firebaseAdmin')

const verifyFBToken = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized" })
  }

  const token = authHeader.split(" ")[1]

  try {
    const decodedUser = await admin.auth().verifyIdToken(token)
    req.user = decodedUser
    next()
  } catch (error) {
    return res.status(401).send({ message: "Invalid Firebase Token" })
  }
}

module.exports = verifyFBToken