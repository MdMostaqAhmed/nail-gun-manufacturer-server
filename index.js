const express = require('express');
const app = express();
const port = process.env.PORT || 5000;


const cors = require('cors');
app.use(cors());
app.use(express.json());

require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ykgatkn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('manufacturer').collection('products')

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