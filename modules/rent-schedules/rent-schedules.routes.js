const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const {
  createOrUpdateSchedule, getClientSchedules, checkOverdueSchedules, sendDueReminders,
} = require("./rent-schedules.controller");

router.post("/", verifyJWT, createOrUpdateSchedule);
router.get("/client/:clientId", verifyJWT, getClientSchedules);

// no JWT needed for internal use
router.post("/check-overdue", checkOverdueSchedules)
router.post("/send-reminders", sendDueReminders)

module.exports = router;