const express = require("express")
const router = express.Router()

const verifyFBToken = require("../../middlewares/verifyFBToken")
const { createJWT, saveUser, getAllUsers, getCurrentUser, updateRole, deleteUser, getAllAgents, saveGoogleUser } = require("./user.controller")
const verifyJWT = require("../../middlewares/verifyJWT")
const verifyAdmin = require("../../middlewares/verifyAdmin")

router.post("/jwt", verifyFBToken, createJWT)
router.post("/", saveUser)
router.post("/google", saveGoogleUser)

router.get("/all-users", verifyJWT, verifyAdmin, getAllUsers)
router.get('/me', verifyJWT, getCurrentUser)
router.get('/all-agents', verifyJWT, verifyAdmin, getAllAgents)

router.patch("/role/:id", verifyJWT, verifyAdmin, updateRole)
router.delete("/:id", verifyJWT, verifyAdmin, deleteUser)

module.exports = router