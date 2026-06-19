const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const verifyAdmin = require("../../middlewares/verifyAdmin");

const {
  submitApplication,
  getAllApplications,
  getPendingApplications,
  getMyApplication,
  approveApplication,
  rejectApplication,
  deleteApplication
} = require("./agent-applications.controller");

router.post("/", verifyJWT, submitApplication);

router.get("/all", verifyJWT, verifyAdmin, getAllApplications);
router.get("/pending", verifyJWT, verifyAdmin, getPendingApplications);
router.get("/my-application", verifyJWT, getMyApplication);

router.patch("/approve/:id", verifyJWT, verifyAdmin, approveApplication);
router.patch("/reject/:id", verifyJWT, verifyAdmin, rejectApplication);

router.delete("/:id", verifyJWT, verifyAdmin, deleteApplication);

module.exports = router;