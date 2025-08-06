import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, default: "bank transfer" }, // Ex: virement, PayPal
  note: { type: String }
});

export default mongoose.model("Payment", paymentSchema);
