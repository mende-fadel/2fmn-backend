// /src/models/Payment.js
const PaymentSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", index:true },
  amount: Number,
  method: String,     // virement, paypal, etc.
  period: String,     // ex "2025-07" (facile pour filtres)
  note: String,
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
