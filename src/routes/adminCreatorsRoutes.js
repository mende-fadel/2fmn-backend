import express from "express";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import User from "../models/User.js";
import CreatorStat from "../models/CreatorStat.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// PUT /api/admin/creators/:id/profile
router.put("/creators/:id/profile", auth, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, bio, profilePic, socials } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, bio, profilePic, socials },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ error: "Createur introuvable" });
    res.json(user);
  } catch (err) {
    console.error("Erreur mise a jour profil createur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/admin/creators/:id/stats
router.post("/creators/:id/stats", auth, isAdmin, async (req, res) => {
  try {
    const { month, revenue, views, posts, byPlatform } = req.body;
    const updated = await CreatorStat.findOneAndUpdate(
      { user: req.params.id, month },
      { revenue, views, posts, byPlatform },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Erreur mise a jour stats:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/admin/creators
router.post("/creators", auth, isAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, bio, profilePic, socials, role, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email deja utilise." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email, firstName, lastName, bio, profilePic, socials,
      password: hashedPassword,
      role: role || "creator"
    });

    await newUser.save();

    const safeUser = newUser.toObject();
    delete safeUser.password;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error("Erreur creation createur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
