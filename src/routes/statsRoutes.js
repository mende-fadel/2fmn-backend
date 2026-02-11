import express from "express";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const totalCreators = await User.countDocuments({ role: "creator" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    // Aggregate monthly revenue via MongoDB pipeline instead of loading all into memory
    const pipeline = await Payment.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlyRevenue = {};
    pipeline.forEach((entry) => {
      monthlyRevenue[entry._id] = entry.total;
    });

    res.json({ totalCreators, totalAdmins, monthlyRevenue });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Impossible de charger les stats" });
  }
});

export default router;
