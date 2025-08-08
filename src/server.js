// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

dotenv.config();

const app = express();

// --- CORS (prod + local dev) ---
const allowedOrigins = [
  "https://2fmn-website.vercel.app",
  "https://twofmn-backend.onrender.com", // Render health checks / same origin requests
  "http://localhost:5173",               // optional: local dev
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: false,
  })
);

app.use(express.json());

// --- Health check / root route (useful for 503s) ---
app.get("/", (_req, res) => {
  res.send("2FMN backend OK ✅");
});

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stats", statsRoutes);

// --- Start server *after* DB is connected ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI env var");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connecté à MongoDB");
    app.listen(PORT, () =>
      console.log(`🚀 Serveur backend sur port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Erreur MongoDB :", err);
    process.exit(1); // Let Render restart the service
  });
