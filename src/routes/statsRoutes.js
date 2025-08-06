import express from "express";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

router.get("/", auth, isAdmin, async (req, res) => {
  try {
    // 🔢 Compter les créateurs et admins
    const totalCreators = await User.countDocuments({ role: "creator" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    // 💰 Récupérer les paiements par mois
    const payments = await Payment.find();

    // 🗓 Organiser par mois (dernier 6 mois)
    const monthlyRevenue = {};
    payments.forEach(p => {
      const month = new Date(p.date).toLocaleString("fr-FR", { month: "short", year: "numeric" });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.amount;
    });

    res.json({
      totalCreators,
      totalAdmins,
      monthlyRevenue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Impossible de charger les stats" });
  }
});

export default router;
