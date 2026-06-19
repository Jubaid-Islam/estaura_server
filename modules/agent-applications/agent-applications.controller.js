const { ObjectId } = require("mongodb");
const { createNotification } = require("../notifications/notificationsHelper");

let applicationCollection;
let userCollection;

const setApplicationCollection = (collection) => {
  applicationCollection = collection;
};

const setUserCollection = (collection) => {
  userCollection = collection;
};

// submit application
const submitApplication = async (req, res) => {
  try {
    const {
      userId, name, email,
      phone, city, experience,
      specialization, bio,
    } = req.body;

    // already pending/approved check
    const existing = await applicationCollection.findOne({
      email,
      status: { $in: ["pending", "approved"] },
    });

    if (existing) {
      return res.status(400).send({
        success: false,
        message: existing.status === "approved"
          ? "You are already an agent."
          : "You already have a pending application.",
      });
    }

    const application = {
      userId,
      name,
      email,
      phone,
      city,
      experience: Number(experience),
      specialization,
      bio,
      status: "pending",
      appliedAt: new Date(),
    };

    const result = await applicationCollection.insertOne(application);

    // notify admin
    await createNotification({
      recipientId: "admin",
      recipientRole: "admin",
      type: "agent_application",
      message: `New agent application from ${name} (${email})`,
      propertyId: null,
      propertyImage: "",
    });

    res.send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// get all applications (admin)
const getAllApplications = async (req, res) => {
  try {
    const applications = await applicationCollection
      .find({})
      .sort({ appliedAt: -1 })
      .toArray();

    res.send({ success: true, data: applications });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// get pending applications (admin)
const getPendingApplications = async (req, res) => {
  try {
    const applications = await applicationCollection
      .find({ status: "pending" })
      .sort({ appliedAt: -1 })
      .toArray();

    res.send({ success: true, data: applications });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// get my application status (user)
const getMyApplication = async (req, res) => {
  try {
    const email = req.user?.email;
    const application = await applicationCollection.findOne({ email });
    res.send({ success: true, data: application || null });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// approve application
const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await applicationCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!application) {
      return res.status(404).send({ success: false, message: "Application not found" });
    }

    // application status update
    await applicationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "approved", reviewedAt: new Date() } }
    );

    // set user role to agent
    if (userCollection && application.email) {
      await userCollection.updateOne(
        { email: application.email },
        { $set: { role: "agent" } }
      );
    }

    // notify user
    await createNotification({
      recipientId: application.email,
      recipientRole: "user",
      type: "application_approved",
      message: `Your agent application has been approved. Your account has been upgraded to Agent.`,
      propertyId: null,
      propertyImage: "",
    });

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// delete application
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await applicationCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// reject application
const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await applicationCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!application) {
      return res.status(404).send({ success: false, message: "Application not found" });
    }

    await applicationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "rejected", reviewedAt: new Date() } }
    );


    // notify user
    await createNotification({
      recipientId: application.email,
      recipientRole: "user",
      type: "application_rejected",
      message: `Your agent application has been reviewed. Unfortunately it was not approved at this time.`,
      propertyId: null,
      propertyImage: "",
    });

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  setApplicationCollection,
  setUserCollection,
  submitApplication,
  getAllApplications,
  getPendingApplications,
  getMyApplication,
  approveApplication,
  deleteApplication,
  rejectApplication,
};