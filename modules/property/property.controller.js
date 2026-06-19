const { ObjectId } = require("mongodb");
const cloudinary = require("../../config/cloudinary");
const { createNotification } = require("../notifications/notificationsHelper");

let propertyCollection;

const setPropertyCollection = (collection) => {
  propertyCollection = collection;
};



// add property
const addProperty = async (req, res) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).send({ success: false, error: "At least one image is required" });
    }

    // Cloudinary- image upload promise
    const uploadPromises = files.map(file =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: "properties",
            quality: 10,
            fetch_format: "auto"
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        ).end(file.buffer);
      })
    );

    const imageUrls = await Promise.all(uploadPromises);

    const property = {
      ...req.body,
      images: imageUrls,
      createdAt: new Date(),
      status: 'approved'
    };

    const result = await propertyCollection.insertOne(property);

    res.send({
      success: true,
      insertedId: result.insertedId,
      data: property,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      error: error.message
    });
  }
};



// get all properties
const getProperties = async (req, res) => {
  try {
    const properties = await propertyCollection
      .find({ status: "approved" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).send({
      success: false,
      message: "Internal server error"
    });
  }
};

// get single property
const getSingleProperty = async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: new ObjectId(id) }
    const property = await propertyCollection.findOne(filter)

    if (!property) {
      return res.status(404).send({ message: "Property not found" });
    }
    res.send(property);

  } catch (err) {
    res.status(500).send({ message: "Failed to fetch property" });
  }
}

// get edit property 
const getEditProperty = async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: new ObjectId(id) }
    const editProperty = await propertyCollection.findOne(filter)

    if (!editProperty) {
      return res.status(404).send({ message: "Edit Property not found" });
    }
    res.send(editProperty);

  } catch (err) {
    res.status(500).send({ message: "Failed to fetch edit property" });
  }
}

// delete property
const deleteProperty = async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };

    // fetch the property to get image urls
    const property = await propertyCollection.findOne(filter);
    if (!property) {
      return res.status(404).send({ message: "Property not found" });
    }

    // delete all associated images from cloudinary
    const imageUrls = property.images || [];
    const deletionPromises = imageUrls.map(async (url) => {
      try {
        // extract public id from cloudinary url
        const parts = url.split('/');
        const fileNameWithExt = parts.pop(); 
        const fileName = fileNameWithExt.split('.')[0]; // remove extension
        const folder = parts.slice(parts.indexOf('upload') + 2).join('/'); 
        const publicId = folder ? `${folder}/${fileName}` : fileName;

        // delete from cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result !== 'ok') {
          console.warn(`Failed to delete image: ${publicId}`, result);
        }
        return { success: true, publicId };
      } catch (err) {
        console.error(`Error deleting image ${url}:`, err.message);
        return { success: false, url, error: err.message };
      }
    });

    // waiting for all deletions 
    await Promise.allSettled(deletionPromises);

    // remove the property document from mongoDB
    const result = await propertyCollection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Property not found after image cleanup" });
    }

    res.status(200).send({
      success: true,
      message: "Property and associated images deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete property error:", error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
};

// assign agent
const assignAgent = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).send({ message: "Agent ID required" });
    }

    const result = await propertyCollection.updateOne(
      { _id: new ObjectId(propertyId) },
      { $set: { agentId: new ObjectId(agentId) } }
    );

    // property info
    const property = await propertyCollection.findOne({
      _id: new ObjectId(propertyId),
    });

    // notification create
    await createNotification({
      recipientId: agentId,
      recipientRole: "agent",
      type: "assigned",
      message: `You have been assigned to: "${property?.title || "A property"}"`,
      propertyId,
      propertyImage: property?.images?.[0] || "",
    });

    res.send(result);
  } catch (error) {
    console.error("Assign Agent Error:", error);
    res.status(500).send({ message: "Server error" });
  }
};


// update property
const updateProperty = async (req, res) => {
  try {
    const id = req.params.id;
    const files = req.files || [];

    // new image upload
    let newImageUrls = [];
    if (files.length > 0) {
      const uploadPromises = files.map(file =>
        new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "properties" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          ).end(file.buffer);
        })
      );
      newImageUrls = await Promise.all(uploadPromises);
    }

    // existing images
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = JSON.parse(req.body.existingImages);
    }

    // final images -> existing + new
    const finalImages = [...existingImages, ...newImageUrls];

    const { existingImages: _, deletedImages: __, images: ___, ...rest } = req.body;

    const updateDoc = {
      $set: {
        ...rest,
        images: finalImages,
        updatedAt: new Date(),
      }
    };

    const result = await propertyCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    res.send({ success: true, result });

  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// agent info by agentId
const getAgentInfoById = async (req, res) => {
  const id = req.params.id;

  const query = [
    {
      $match: { _id: new ObjectId(id) }    // specific property
    },
    {
      $lookup: {
        from: "users",
        localField: "agentId",    // property object field
        foreignField: "_id",      // user object field
        as: "agentInfo"
      }
    },
    {
      $unwind: "$agentInfo" // array to object
    },
    {
      $project: {
        "agentInfo.name": 1,
        "agentInfo.email": 1
      }
    }
  ];

  const result = await propertyCollection.aggregate(query).toArray();
  res.send(result[0]); // single object
}

// submit property with pending status
const submitProperty = async (req, res) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).send({ success: false, error: "At least one image is required" });
    }

    const uploadPromises = files.map(file =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: "properties",
            quality: 10,
            fetch_format: "auto"
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        ).end(file.buffer);
      })
    );

    const imageUrls = await Promise.all(uploadPromises);

    const property = {
      ...req.body,
      images: imageUrls,
      status: "pending",
      submittedBy: {
        email: req.user.email,   // from verifyJWT 
        name: req.user.name
      },
      createdAt: new Date(),
    };

    const result = await propertyCollection.insertOne(property);

    await createNotification({
      recipientId: "admin",
      recipientRole: "admin",
      type: "property_submitted",
      message: `New property submitted by ${req.user?.name || req.user?.email}`,
      propertyId: result.insertedId.toString(),
      propertyImage: imageUrls[0] || "",
    });

    res.send({ success: true, insertedId: result.insertedId, data: property });

  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};


// get pending properties
const getPendingProperties = async (req, res) => {
  try {
    const properties = await propertyCollection.aggregate([
      { $match: { status: "pending" } },

      {
        $lookup: {
          from: "users",
          localField: "submittedBy.email",
          foreignField: "email",
          as: "submitterInfo"
        }
      },

      {
        $addFields: {
          submittedBy: {
            email: { $arrayElemAt: ["$submitterInfo.email", 0] },
            name: { $arrayElemAt: ["$submitterInfo.name", 0] },
            // photo: { $arrayElemAt: ["$submitterInfo.photo", 0] },
          }
        }
      },

      { $unset: "submitterInfo" },
      { $sort: { createdAt: -1 } }

    ]).toArray();

    res.status(200).send({ success: true, count: properties.length, data: properties });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal server error" });
  }
};

// approve property
const approveProperty = async (req, res) => {
  try {
    const id = req.params.id;

    const property = await propertyCollection.findOne({ _id: new ObjectId(id) });

    const result = await propertyCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "approved" } }
    );

    if (property && property.submittedBy && property.submittedBy.email) {
      await createNotification({
        recipientId: property.submittedBy.email,
        recipientRole: "user",
        type: "approved",
        message: `Your property "${property.title || "A property"}" has been approved`,
        propertyId: id,
        propertyImage: property.images?.[0] || "",
      });
    }

    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, message: "Server error" });
  }
};

// reject property
const rejectProperty = async (req, res) => {
  try {
    const id = req.params.id;

    const property = await propertyCollection.findOne({ _id: new ObjectId(id) });

    const result = await propertyCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "rejected" } }
    );

    if (property && property.submittedBy && property.submittedBy.email) {
      await createNotification({
        recipientId: property.submittedBy.email,
        recipientRole: "user",
        type: "rejected",
        message: `Your property "${property.title || "A property"}" has been rejected`,
        propertyId: id,
        propertyImage: property.images?.[0] || "",
      });
    }

    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, message: "Server error" });
  }
};

// get properties by agent
const getPropertiesByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const properties = await propertyCollection
      .find({ agentId: new ObjectId(agentId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send({ success: true, count: properties.length, data: properties });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal server error" });
  }
};


// update property status
const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await propertyCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};

// update deal status 
const updateDealStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { dealStatus } = req.body;

    await propertyCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { dealStatus, updatedAt: new Date() } }
    );

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
};



module.exports = {
  setPropertyCollection,
  addProperty,
  getProperties,
  getSingleProperty,
  getEditProperty,
  deleteProperty,
  assignAgent,
  updateProperty,
  getAgentInfoById,
  submitProperty,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  getPropertiesByAgent,
  updatePropertyStatus,
  updateDealStatus,


};