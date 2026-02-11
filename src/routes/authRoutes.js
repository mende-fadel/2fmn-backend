import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import multer from "multer";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Cet utilisateur existe deja" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "creator"
    });

    await user.save();
    res.status(201).json({ message: "Utilisateur cree avec succes" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur création utilisateur" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password: _, ...safeUser } = user.toObject();
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur connexion" });
  }
});

// UPDATE PROFILE (creator)
router.put("/profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, profilePic } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, profilePic },
      { new: true }
    ).select("-password");
    res.json({ message: "Profil mis a jour", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur mise à jour profil" });
  }
});

// uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

router.post("/upload", auth, upload.single("profilePic"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// CREATOR DASHBOARD (exemple)
router.get("/dashboard", auth, async (req, res) => {
  try {
    res.json({ revenusMois: 1250, vuesCumulées: 350000, campagnes: 3 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur du serveur" });
  }
});

// ADMIN: USERS
router.get("/admin/users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/admin/users/:id/revenus", auth, isAdmin, async (req, res) => {
  try {
    const { revenus } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { revenus }, { new: true });
    res.json({ message: "Revenus mis a jour", user });
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour revenus" });
  }
});

router.delete("/admin/users/:id", auth, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Utilisateur supprime" });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression utilisateur" });
  }
});

// CHECK ADMIN (utilise req.user.role depuis le JWT)
router.get("/check-admin", auth, (req, res) => {
  res.json({ isAdmin: req.user.role === "admin" });
});

// ME (corrigé)
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
