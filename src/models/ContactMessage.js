import mongoose from "mongoose";

const ContactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    // anti‑spam honeypot (ne doit jamais être rempli par un humain)
    hp: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("ContactMessage", ContactMessageSchema);
