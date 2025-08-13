// /src/routes/creatorRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import CreatorStat from "../models/CreatorStat.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const router = express.Router();

// GET /api/creator/me  → profil + KPIs actuels
router.get("/me", auth, async (req,res)=>{
  try{
    const me = await User.findById(req.user.id).select("-password");
    if(!me || me.role!=="creator") return res.status(403).json({error:"Forbidden"});
    res.json(me);
  }catch(e){ res.status(500).json({error:"Server error"}) }
});

// GET /api/creator/performance?from=2025-01&to=2025-12
router.get("/performance", auth, async (req,res)=>{
  try{
    const { from, to } = req.query; // "YYYY-MM"
    const q = { creator: req.user.id };
    if (from && to) q.month = { $gte: from, $lte: to };
    const stats = await CreatorStat.find(q).sort({ month:1 });
    res.json(stats);
  }catch(e){ res.status(500).json({error:"Server error"}) }
});

// GET /api/creator/payments?month=2025-07
router.get("/payments", auth, async (req,res)=>{
  try{
    const q = { creator: req.user.id };
    if (req.query.month) q.period = req.query.month;
    const payments = await Payment.find(q).sort({ date:-1 });
    res.json(payments);
  }catch(e){ res.status(500).json({error:"Server error"}) }
});

export default router;
