import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "creator"], default: "creator" }, // ✅ NOUVEAU
  revenus: { type: Number, default: 0 }, 
  vues: { type: Number, default: 0 },
  campagnes: { type: Number, default: 0 }
});

export default mongoose.model("User", userSchema);
