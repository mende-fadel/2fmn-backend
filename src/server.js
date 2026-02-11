import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import creatorRoutes from "./routes/creatorRoutes.js";
import adminCreatorsRoutes from "./routes/adminCreatorsRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
dotenv.config();

const app = express();

const allowedOrigins = [
  "https://2fmn-website.vercel.app",
  "https://2fmnmanagementltd.com",
  "https://api.2fmnmanagementltd.com",
  "http://localhost:5173",
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

app.get("/", (_req, res) => {
  res.send("2FMN backend OK");
});

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/admin", adminCreatorsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/upload", uploadRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI env var");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
