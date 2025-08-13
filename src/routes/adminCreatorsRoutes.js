// /src/routes/adminCreatorsRoutes.js
import express from "express";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import User from "../models/User.js";
import CreatorStat from "../models/CreatorStat.js";

const router = express.Router();

// PUT /api/admin/creators/:id/profile
router.put("/creators/:id/profile", auth, isAdmin, async (req,res)=>{
  const { firstName, lastName, bio, profilePic, socials } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { firstName, lastName, bio, profilePic, socials },
    { new:true }
  ).select("-password");
  res.json(user);
});

// POST /api/admin/creators/:id/stats  (création/maj du mois)
router.post("/creators/:id/stats", auth, isAdmin, async (req,res)=>{
  const { month, revenue, views, posts, byPlatform } = req.body;
  const updated = await CreatorStat.findOneAndUpdate(
    { creator: req.params.id, month },
    { revenue, views, posts, byPlatform },
    { upsert:true, new:true }
  );
  res.json(updated);
});

export default router;
