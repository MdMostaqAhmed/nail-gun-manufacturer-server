const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


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
        const ordersCollection = client.db("manufacturer").collection("orders");
        const paymentCollection = client.db("manufacturer").collection("payment");

        //Verify Admin
        const verifyAdmin = async (req, res, next) => {
            //Requester who want to Make another User an Admin
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({
                email: requester,
            });
            if (requesterAccount.role === "admin") {
                next();
            } else {
                res.status(403).send({ message: "Forbidden,You dont have the power" });
            }
        };

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

        //Add a product
        app.post("/products", verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });



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

        //Get All the orders for a Specific User
        app.get("/order", verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            console.log(userEmail);
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const orders = await ordersCollection.find(query).toArray();
                res.send(orders);
            } else {
                return res
                    .status(403)
                    .send({ message: "Forbidden Access! you aren't the right user" });
            }
        });

        //Get a Specific Product Info For Payment
        app.get("/orders/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.send(order);
        });



        //Make a specific user to Admin
        app.put("/user/admin/:email", verifyJWT, async (req, res) => {
            //The user Whom want to make admin
            const email = req.params.email;
            //Requester who want to Make another User an Admin
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({
                email: requester,
            });
            if (requesterAccount.role === "admin") {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: "admin" },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                res.status(403).send({ message: "forbidden,You dont have the power" });
            }
        });

        //Check a User Adminability
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role == "admin";
            res.send({ admin: isAdmin });
        });

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

        //Get All Orders From DB
        app.get("/orders", async (req, res) => {
            const query = {};
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        //Get All the orders for a Specific User
        app.get("/order", verifyJWT, async (req, res) => {
            //Requested Email
            const userEmail = req.query.userEmail;
            console.log(userEmail);
            // const authorization = req.headers.authorization;
            // console.log(authorization);
            // Give the information's to the Exact(Right) user,Dont give other Users Info
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const orders = await ordersCollection.find(query).toArray();
                res.send(orders);
            } else {
                return res
                    .status(403)
                    .send({ message: "Forbidden Access! you aren't the right user" });
            }
        });

        //get all users
        app.get("/user", async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });

        //Delete a User from User Collection
        app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const restUsers = await usersCollection.deleteOne(filter);
            res.send(restUsers);
        });


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
            const token = jwt.sign({ email: email }, process.env.MY_ACCESS_TOKEN, {
                expiresIn: "15d",
            });
            res.send({ result, token });
        });

        //Update status after shipment
        app.patch("/ship/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: payment.status,
                },
            };
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
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