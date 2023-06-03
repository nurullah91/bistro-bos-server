const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');



// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next)=>{
    const authorization = req.headers.authorization;

    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'})
    }

    // barer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
            return res.status(401).send({error:true, message: "Unauthorized token"})
        }
        req.decoded = decoded;
        next();

    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gspcn8d.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const userCollection = client.db("bistroDB").collection("users");
        const menuCollection = client.db("bistroDB").collection("menu");
        const reviewsCollection = client.db("bistroDB").collection("reviews");
        const cartCollection = client.db("bistroDB").collection("cart");



        app.post('/jwt', (req, res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" } )
            res.send({token});
        })

        // user related API 

        const verifyAdmin = async (req, res, next) =>{
            const email = req.decoded.email;
            const query = {email:email};
            const user = await userCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send({error: true, message: 'forbidden access'})
            }
            next();
        }


        
        app.get('/users', verifyJWT, verifyAdmin,  async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })




        app.post('/users', async (req, res) => {
            const user = req.body;
            const userEmail = user.email;
            const query = { email: userEmail };

            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                console.log(existingUser);
                return res.send({ message: 'user already exist' })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/admin/:email', verifyJWT, async(req, res)=>{
            const email = req.params.email;

            if(req.decoded.email !== email){
                res.send({admin:false})
            }

            const query = {email: email}
            const user = await userCollection.findOne(query);

            const result = {admin: user?.role === 'admin'};
            res.send(result);
        })


        app.patch('/users/admin/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};

            const updatedDoc = {
                $set: {
                    role: "admin"
                },
            };

            const result = await userCollection.updateOne(filter, updatedDoc);

            res.send(result);
        })

        // menu related API
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })

        // review related API
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        })


        // cart related API
        app.get('/carts', verifyJWT, async (req, res) => {

            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if(email !== decodedEmail){
                return res.status(403).send({error:true, message: "Forbidden access"})
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);

        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })

        // delete Related API
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);

            res.send(result);
        })





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Bistro boss server is running");
})

app.listen(port, () => {
    console.log(`Bistro boss server is running on the port ${port}`);
})