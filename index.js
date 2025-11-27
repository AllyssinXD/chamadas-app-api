import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'
import router from './routes/index.js';

dotenv.config()
const app = express();

// Middlewares
app.use(
  cors({
    origin: true, // Isso permite requisições de QUALQUER origem legítima (ideal para mobile)
    credentials: true, // Permite cookies e autenticação
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
// Rotas
app.use("/api", router)
app.post("/generateCrypt", async (req, res)=>{
  const password = await bcrypt.hash(req.body.password, 12)
  res.json({password})
})

// Mongoose Connection
async function connectDB(){
  try{
    await mongoose.connect(process.env.MONGO_URI, {
      serverApi: {version: '1', strict: true, deprecationErrors: true},
      dbName: "chamadasApp"
    })
    await mongoose.connection.db?.admin().command({ ping: 1 });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }catch(err){
    console.log("Error connecting with Mongo : " + err)
  }
}

// Inicialização do servidor
app.listen(5000, () => {
  console.log('Servidor rodando na porta 5000');
  connectDB();
});