const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware

const corsConfig = {
    origin: "*",
    credentials: true,
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}
app.use(cors(corsConfig));
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.v9m7cjb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJwt = (req, res, next) => {
    console.log("line-33 " + req.headers.authorization);
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: "Authorization failed"});
    }
    const token = authorization.split(' ')[1];
    console.log("line-39 " + token);
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
        if(err){
            return res.status(401).send({error: true, message: "Invalid token"});
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        app.get("/", (req, res) => {
            res.send("Car doctor running");
        });

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const serviceCollections = client.db("carDoctorDB").collection("services");
        const orderCollections = client.db("carDoctorDB").collection("orders");


        // jwt
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN,
                { expiresIn: "1h" });
            res.send({ token });
        })


        // get all services from the service collection
        app.get("/services", async (req, res) => {
            const result = await serviceCollections.find().toArray();
            res.send(result);
        })

        // get a individual service from the service collection
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            console.log("id: " + id);
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 }
            }
            const result = await serviceCollections.findOne(query, options);
            res.send(result);
        });
        // // get logged in user total order by direct email 
        // app.get("/cart/:email", async (req, res) =>{
        //     const email = req.params.email;
        //     const result = await orderCollections.find({email: email}).toArray();
        //     res.send(result);
        // })

        // get logged in users total order by query parameters

        app.get("/cart",verifyJwt, async (req, res) => {
            // console.log("decoded 118: " + req.decoded.email);
            if(req.decoded.email !== req.query.email){
                return res.status(402).send({error: true, message: "access invalid"});
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await orderCollections.find(query).toArray();
            res.send(result);
        })

        // insert order information to booking collection
        app.post("/booking", async (req, res) => {
            const orderInfo = req.body;
            console.log(orderInfo);
            const result = await orderCollections.insertOne(orderInfo);
            res.send(result);
        })
        // Update Cart Status 
        app.patch("/cartStatusUpdate/:id", async (req, res) => {
            const updateStatus = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: updateStatus.status
                },
            };
            const result = await orderCollections.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // Delete cart form order collection
        app.delete("/cartDelete/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await orderCollections.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("carDoctorDB").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log("Server listening on port " + port);
});

// open terminal and node
// require('crypto').randomBytes(64).toString('hex')