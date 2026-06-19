const jwt = require("jsonwebtoken")
const { ObjectId } = require("mongodb")

let userCollection

const setUserCollection = (collection) => {
  userCollection = collection
}

const createJWT = async (req, res) => {
  const email = req.user.email
  const user = await userCollection.findOne({ email })
  const role = user?.role || "user", name = user?.name

  // token create
  const token = jwt.sign({ email, role, name }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d"
  })
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  }).send({ success: true })
}


// save user
const saveUser = async (req, res) => {
  try {
    const user = req.body

    if (!user || !user.email) {
      return res.status(400).send({ message: "Email is required" })
    }

    const exists = await userCollection.findOne({ email: user.email })

    if (exists) {
      return res.status(200).send({ message: "User already exists", user: exists })
    }

    const newUser = {
      ...user,
      role: "user",
      createdAt: new Date(),
      lastLogin: new Date()
    }


    const result = await userCollection.insertOne(newUser)
    res.status(201).send(result)

  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Server error" })
  }
}

// save user
const saveGoogleUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // find by email, update/ insert
    const result = await userCollection.updateOne(
      { email },
      {
        $set: {
          name: name || '',
          email,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          role: 'user',      // default
          provider: 'google' // track sign-in method
        }
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: result.upsertedId ? 'User created' : 'User updated',
      user: { name, email }
    });
  } catch (error) {
    console.error('Google user upsert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

//get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await userCollection.find().toArray()
    res.send(users)
    // console.log(users)
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Server error" })
  }
}

// get current user
const getCurrentUser = async (req, res) => {
  try {
    const email = req.user?.email
    const user = await userCollection.findOne({ email: email })
    res.send(user)
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Server error" })
  }
}


// update role
const updateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;

    if (!role) {
      return res.status(400).send({ message: "Role is required" });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: role
      },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
}

// delete user
const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(filter);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
}

// get all agents
const getAllAgents = async (req, res) => {
  try {
const agents = await userCollection.find({ role: 'agent' }).toArray();
    res.send(agents)
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Server error" })
  }
}

module.exports = {
  setUserCollection,
  createJWT,
  saveUser,
  saveGoogleUser,
  getAllUsers,
  getCurrentUser,
  updateRole,
  deleteUser,
  getAllAgents
}