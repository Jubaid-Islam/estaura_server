const express = require("express")
const router = express.Router()

const verifyJWT = require("../../middlewares/verifyJWT")
const { connectApi, getConnectedApis, syncApiData, getSyncedData, disconnectApi } = require("./integration.controller")


router.post("/connect-api", verifyJWT, connectApi)
router.post("/sync/:id", verifyJWT, syncApiData)
router.get("/connected-api", verifyJWT, getConnectedApis)
router.get("/api-status", verifyJWT, getConnectedApis)
router.get("/api-list", verifyJWT, getSyncedData)
router.delete("/disconnect-api/:id", verifyJWT, disconnectApi)



module.exports = router