const { MongoClient, ServerApiVersion } = require("mongodb")

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@jubaid.xspkh92.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

const connectDB = async () => {
  await client.connect()
  console.log("MongoDB Connected Successfully")
  return client
}

module.exports = connectDB