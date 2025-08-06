import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stats", statsRoutes);
// Connexion à MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ Connecté à MongoDB");
    app.listen(5000, () => console.log("🚀 Serveur backend sur http://localhost:5000"));
  })
  .catch((err) => console.error("❌ Erreur MongoDB :", err));
