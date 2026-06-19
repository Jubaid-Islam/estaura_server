const express = require("express");
const router = express.Router();
const verifyJWT = require("../../middlewares/verifyJWT");
const { getNotifications, markAllRead, markOneRead,
} = require("./notifications.controller");


router.get("/:recipientId/:recipientRole", verifyJWT, getNotifications);

// patch mark all read
router.patch("/read-all/:recipientId/:recipientRole", verifyJWT, markAllRead);
router.patch("/read-one/:id", verifyJWT, markOneRead);

module.exports = router;
