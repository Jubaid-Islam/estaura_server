const { ObjectId } = require("mongodb");
const { createNotification } = require("../notifications/notificationsHelper");

let rentScheduleCollection;

const setRentScheduleCollection = (collection) => {
  rentScheduleCollection = collection;
};

// next due date calculate - 1 month forward
const getNextDueDate = (fromDate) => {
  const next = new Date(fromDate);
  next.setMonth(next.getMonth() + 1);
  return next;
};

// current month string 
const getMonthString = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

// create or update rent schedule
const createOrUpdateSchedule = async (req, res) => {
  try {
    const {
      dealId, propertyId, propertyTitle,
      clientId, clientEmail, agentId,
      monthlyAmount,
    } = req.body

    const currentMonth = getMonthString();

    const existing = await rentScheduleCollection.findOne({ dealId })

    if (existing) {
      const nextDue = getNextDueDate(existing.nextDueDate)
      await rentScheduleCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            nextDueDate: nextDue,
            lastPaidAt: new Date(),
            currentMonth,
            status: "active",
          },
          $inc: {
            totalPaid: Number(monthlyAmount),
            totalMonths: 1,
          }
        }
      );
      return res.send({ success: true, isNew: false })
    }

    // new schedule
    const startDate = new Date();
    const nextDueDate = getNextDueDate(startDate);

    const schedule = {
      dealId,
      propertyId, propertyTitle,
      clientId, clientEmail,
      agentId,
      monthlyAmount: Number(monthlyAmount),
      startDate,
      nextDueDate,
      lastPaidAt: new Date(),
      currentMonth,
      totalPaid: Number(monthlyAmount),
      totalMonths: 1,
      missedPayments: 0,
      status: "active",    // active / overdue / cancelled
      createdAt: new Date(),
    };

    await rentScheduleCollection.insertOne(schedule);
    res.send({ success: true, isNew: true });
  } catch (error) {
    console.error("Rent schedule error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
};

// get client schedules
const getClientSchedules = async (req, res) => {
  try {
    const { clientId } = req.params;
    const schedules = await rentScheduleCollection
      .find({ clientId })
      .sort({ createdAt: -1 })
      .toArray();
    res.send({ success: true, data: schedules });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// check overdue schedules
const checkOverdueSchedules = async (req, res) => {
  try {
    const now = new Date();

    // nextDueDate gone but not paid
    const overdueSchedules = await rentScheduleCollection
      .find({ nextDueDate: { $lt: now }, status: "active" })
      .toArray()

    for (const schedule of overdueSchedules) {
      await rentScheduleCollection.updateOne(
        { _id: schedule._id },
        { $set: { status: "overdue" }, $inc: { missedPayments: 1 } }
      )

      // notify client
      await createNotification({
        recipientId: schedule.clientEmail,
        recipientRole: "user",
        type: "rent_overdue",
        message: `Your rent payment for "${schedule.propertyTitle}" is overdue. Please pay now.`,
        propertyId: schedule.propertyId,
      });

      // notify agent
      await createNotification({
        recipientId: schedule.agentId,
        recipientRole: "agent",
        type: "rent_overdue",
        message: `Rent overdue: "${schedule.propertyTitle}" — tenant has missed payment.`,
        propertyId: schedule.propertyId,
      })
    }

    res.send({ success: true, overdueCount: overdueSchedules.length })
  } catch (error) {
    res.status(500).send({ success: false, error: error.message })
  }
};

// send due reminder -> 3 days before
const sendDueReminders = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    const dueSoonSchedules = await rentScheduleCollection.find({
      nextDueDate: { $gte: now, $lte: threeDaysLater },
      status: "active",
    }).toArray();

    for (const schedule of dueSoonSchedules) {
      await createNotification({
        recipientId: schedule.clientEmail,
        recipientRole: "user",
        type: "rent_due_soon",
        message: `Your rent payment of $${schedule.monthlyAmount.toLocaleString()} for "${schedule.propertyTitle}" is due in 3 days.`,
        propertyId: schedule.propertyId,
      });
    }

    res.send({ success: true, reminderCount: dueSoonSchedules.length });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  setRentScheduleCollection,
  createOrUpdateSchedule,
  getClientSchedules,
  checkOverdueSchedules,
  sendDueReminders,
}

// apis:
// router.post("/", verifyJWT, createOrUpdateSchedule);
// router.get("/client/:clientId", verifyJWT, getClientSchedules);
// router.post("/check-overdue", checkOverdueSchedules)
// router.post("/send-reminders", sendDueReminders)
