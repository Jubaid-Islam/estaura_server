const axios = require("axios")
const { ObjectId } = require("mongodb")
const crypto = require("crypto")

let integrationCollection

const setIntegrationCollection = (collection) => {
  integrationCollection = collection
}

let dataCollection

const setDataCollection = (collection) => {
  dataCollection = collection
}

// post api
const connectApi = async (req, res) => {
  try {

    const apiData = req.body
    console.log("Connect API Payload:", apiData)

    if (!apiData?.endpoint) {
      console.log("Returning 400: API endpoint required")
      return res.status(400).send({ message: "API endpoint required" })
    }

    const exists = await integrationCollection.findOne({
      endpoint: apiData.endpoint
    })

    if (exists) {
      return res.status(400).send({ message: "API already connected" })
    }

    const result = await integrationCollection.insertOne({
      ...apiData,
      status: "connected",
      createdAt: new Date()
    })

    res.status(201).send(result)

  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Server error" })
  }
}

// connect api
const getConnectedApis = async (req, res) => {
  try {

    const apis = await integrationCollection.find({})
      .sort({ createdAt: -1 })
      .toArray()

    res.send(apis)

  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Failed to fetch APIs" })
  }
}

// disconnect api
const disconnectApi = async (req, res) => {
  try {

    const { id } = req.params

    const api = await integrationCollection.findOne({
      _id: new ObjectId(id)
    })

    if (!api) {
      return res.status(404).send({ message: "API not found" })
    }

    // integration delete
    await integrationCollection.deleteOne({
      _id: new ObjectId(id)
    })

    // related data delete
    await dataCollection.deleteMany({
      source: api.name
    })

    res.send({
      message: "API disconnected and data removed"
    })

  } catch (error) {

    console.error(error)

    res.status(500).send({
      message: "Failed to disconnect API"
    })

  }
}


// get data from api
const syncApiData = async (req, res) => {

  try {

    const { id } = req.params

    const api = await integrationCollection.findOne({
      _id: new ObjectId(id)
    })

    if (!api) {
      return res.status(404).send({ message: "API not found" })
    }

    const endpoint = api.endpoint

    // external API call
    const response = await axios.get(endpoint)

    const apiData = response.data

    if (!Array.isArray(apiData)) {
      return res.status(400).send({ message: "API data must be array" })
    }

    // Stable SHA-256 hash of item content
    const makeDataHash = (item) => {
      const { id, ...rest } = item
      const stable = JSON.stringify(rest, Object.keys(rest).sort())
      return crypto.createHash("sha256").update(stable).digest("hex")
    }

    // fetch existing records for this source
    const existingDocs = await dataCollection
      .find({ source: api.name })
      .project({ _id: 1, externalId: 1, dataHash: 1 })
      .toArray()

    const existingMap = new Map(
      existingDocs.map(d => [`${d.externalId}::${d.dataHash}`, d._id])
    )

    // build incoming items with fingerprints
    const incomingItems = apiData.map(item => ({
      ...item,
      externalId: String(item.id),
      dataHash: makeDataHash(item),
      source: api.name,
      importedAt: new Date()
    }))

    const incomingFingerprints = new Set(
      incomingItems.map(i => `${i.externalId}::${i.dataHash}`)
    )

    // fingerprint not yet in DB
    const toInsert = incomingItems.filter(
      item => !existingMap.has(`${item.externalId}::${item.dataHash}`)
    )

    // DELETE: DB record whose fingerprint is absent from incoming data
    const toDeleteIds = existingDocs
      .filter(d => !incomingFingerprints.has(`${d.externalId}::${d.dataHash}`))
      .map(d => d._id)

    let insertedCount = 0
    let deletedCount = 0

    if (toInsert.length > 0) {
      const result = await dataCollection.insertMany(toInsert)
      insertedCount = result.insertedCount
    }

    if (toDeleteIds.length > 0) {
      const result = await dataCollection.deleteMany({ _id: { $in: toDeleteIds } })
      deletedCount = result.deletedCount
    }

    // update integration metadata
    await integrationCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { lastSync: new Date() },
        $inc: { syncedCount: insertedCount }
      }
    )

    res.send({
      message: "API synced successfully",
      inserted: insertedCount,
      deleted: deletedCount
    })

  } catch (error) {

    console.error(error)

    if (error.response) {
      return res.status(error.response.status).send({
        message: `External API error: ${error.response.status} ${error.response.statusText}`
      })
    }

    if (error.request) {
      return res.status(400).send({
        message: "Failed to connect to the external API endpoint"
      })
    }

    res.status(500).send({
      message: "Failed to sync API data: " + error.message
    })

  }

}


// get synec data
const getSyncedData = async (req, res) => {
  try {

    const data = await dataCollection
      .find({})
      .sort({ importedAt: -1 })
      .toArray()

    res.send(data)

  } catch (error) {

    console.error(error)
    res.status(500).send({ message: "Failed to fetch data" })

  }
}



module.exports = {
  setIntegrationCollection,
  setDataCollection,
  connectApi,
  getConnectedApis,
  syncApiData,
  getSyncedData,
  disconnectApi
}