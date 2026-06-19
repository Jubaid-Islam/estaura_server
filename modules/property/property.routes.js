const express = require("express");
const upload = require("./upload");
const { addProperty, getProperties, getSingleProperty, deleteProperty, assignAgent, getEditProperty, updateProperty, getAgentInfoById, submitProperty, getPendingProperties, rejectProperty, approveProperty, getPropertiesByAgent, updatePropertyStatus, updateDealStatus } = require("./property.controller");

const verifyJWT = require("../../middlewares/verifyJWT");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const verifyAgent = require("../../middlewares/verifyAgent");

const router = express.Router();

// post
router.post("/add-property", verifyJWT, verifyAdmin, upload.array("images"), addProperty);
router.post("/submit-property", verifyJWT, upload.array("images"), submitProperty);

// get
router.get("/get-properties", getProperties);
router.get("/edit-property/:id", getEditProperty);
router.get("/:id/agent-info", getAgentInfoById);
router.get("/pending-properties", verifyJWT, verifyAdmin, getPendingProperties);
router.get("/agent/:agentId", verifyJWT, verifyAgent, getPropertiesByAgent);

// get_daynamic
router.get("/:id", getSingleProperty);

// patch
router.patch('/assign-agent/:propertyId',verifyJWT, verifyAdmin, assignAgent);  
router.patch("/approve/:id", verifyJWT, verifyAdmin, approveProperty);
router.patch("/reject/:id", verifyJWT, verifyAdmin, rejectProperty);
router.patch("/status/:id", verifyJWT, verifyAgent, updatePropertyStatus);
router.patch("/deal-status/:id", verifyJWT, verifyAgent, updateDealStatus);

// delete_daynamic
router.delete("/:id", verifyJWT, verifyAdmin, deleteProperty);
router.delete("/agent/:id", verifyJWT, verifyAgent, deleteProperty);

// put
router.put("/update-property/:id", verifyJWT, verifyAdmin, upload.array("images"), updateProperty);


module.exports = router;