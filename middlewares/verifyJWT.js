const jwt = require("jsonwebtoken")

const verifyJWT = (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).send({ message: "Unauthorized" })
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" })
    }
    req.user = decoded
    next()
  })
}

module.exports = verifyJWT