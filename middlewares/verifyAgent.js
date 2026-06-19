const verifyAgent = (req, res, next) => {
  if (req.user.role !== "agent" ) {
    return res.status(403).send({ message: "Access denied" })
  }
  next()
}

module.exports = verifyAgent