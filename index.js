const express = require('express');
const app = express();
const port = process.env.PORT || 5000;


const cors = require('cors');
app.use(cors());
app.use(express.json());

require('dotenv').config();
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ykgatkn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access!" });
    }
    //get the token from Auth header by Spliting
    const token = authHeader.split(" ")[1];
    //Verify Token (If it is Correct or not)
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            // if Token is not Correct
            return res.status(403).send({ message: "Forbidden Access" });
        }
        //If token is Right
        req.decoded = decoded;
        console.log(decoded); // bar
        next();
    });
};

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('manufacturer').collection('products');
        const usersCollection = client.db("manufacturer").collection("users");

        //Check Whether the user Was Previously logged in or Not
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            //If the user is not existed it will add
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
                expiresIn: "15d",
            });
            res.send({ result, token });
        });

        //Get All Products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products)
        })

        // Get A Specific Product Detail
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

        //Add a Order
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const query = {
                name: order.name,
                userEmail: order.userEmail,
            };
            const exists = await ordersCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists });
            }
            const result = await ordersCollection.insertOne(order);
            return res.send({ success: true, result });
        });

        //Check a User Adminability
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === "admin";
            console.log("asas")

            res.send({ admin: isAdmin });
        });

    } finally {

    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Hello World")
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})