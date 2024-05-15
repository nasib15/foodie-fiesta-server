const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://foodiefiesta-b4714.web.app",
    "https://foodiefiesta-b4714.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Verify a JWT middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ error: "Unauthorized Access" });
  }
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: "Unauthorized Access" });
      }
      console.log(decoded);
      req.user = decoded;
      next();
    });
  }
};

// Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.talr0yk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const foodsCollection = client.db("foodsDB").collection("foodsCollection");

    // Generate a JWT token
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // Clear the token on logout
    app.post("/logout", (req, res) => {
      const user = req.body;
      console.log(user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // Verify a JWT token

    // Routes

    // Getting all datas from the database
    app.get("/foods", async (req, res) => {
      const sort = req.query.sort;
      const search = req.query.search;
      const status = req.query.status;
      let option = {};
      let query = {};
      if (sort) {
        option = { sort: { expired_date: sort === "asc" ? 1 : -1 } };
      }
      if (status) {
        query = { status: status };
      }
      if (search) {
        query.food_name = { $regex: search, $options: "i" };
      }
      const result = await foodsCollection.find(query, option).toArray();
      res.send(result);
    });

    // Getting a single data by ID from the database
    app.get("/food/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    // Getting a single data for a specific user from the database
    app.get("/foods/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user?.email)
        return res.status(403).send({ error: "Forbidden Access" });
      const query = { donor_email: email };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });

    // Posting a data to the database
    app.post("/foods", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await foodsCollection.insertOne(data);
      res.send(result);
    });

    // Updating a data in the database
    app.patch("/food/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: req.body };
      const result = await foodsCollection.updateOne(query, update);
      res.send(result);
    });

    // Deleting a data from the database
    app.delete("/food/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
