
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import multer from "multer";

const router = express.Router();


// ✅ REGISTER (création de compte)
router.post("/register", async (req, res) => {
  try {
    const {firstName, lastName, email, password, role } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Cet utilisateur existe déjà" });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: role || "creator"   // ✅ Par défaut, c'est un créateur
    });

    await user.save();
    res.status(201).json({ message: "Utilisateur créé ✅" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur création utilisateur" });
  }
});


// ✅ LOGIN (connexion)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    // Comparer le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect" });

    // Générer le token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    // ✅ ➕ Inclure le rôle dans la réponse
    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur connexion" });
  }
});

// ✅ MISE À JOUR DU PROFIL CRÉATEUR
router.put("/profile", auth, async (req, res) => {
  try {
    const { firstName, lastName, profilePic } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, profilePic },
      { new: true }
    ).select("-password");

    res.json({ message: "✅ Profil mis à jour", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur mise à jour profil" });
  }
});
// 📁 Dossier de stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // stocker dans /uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ UPLOAD PHOTO
router.post("/upload", auth, upload.single("profilePic"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier envoyé" });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// ✅ ROUTE CRÉATEUR : Dashboard de base (protégée)
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Ici tu pourrais récupérer des infos spécifiques à l’utilisateur connecté
    res.json({
      revenusMois: 1250,
      vuesCumulées: 350000,
      campagnes: 3
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur du serveur" });
  }
});


// ✅ ROUTE ADMIN : liste tous les utilisateurs (protégée)
router.get("/admin/users", auth, isAdmin, async (req, res) => {
  try {
    // On récupère tous les users sans afficher les mots de passe
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ Modifier les revenus d’un utilisateur (ADMIN uniquement)
router.put("/admin/users/:id/revenus", auth, isAdmin, async (req, res) => {
  try {
    const { revenus } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { revenus },
      { new: true }
    );
    res.json({ message: "Revenus mis à jour ✅", user });
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour revenus" });
  }
});

// ✅ Supprimer un utilisateur (ADMIN uniquement)
router.delete("/admin/users/:id", auth, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Utilisateur supprimé ✅" });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression utilisateur" });
  }
});

// ✅ Vérifier si l'utilisateur est admin
router.get("/check-admin", auth, (req, res) => {
  res.json({ isAdmin: req.user.role === "admin" });
});

// ✅ MISE À JOUR PROFIL PAR ADMIN
router.put("/admin/users/:id", auth, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, profilePic } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, profilePic },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    res.json({ message: "✅ Profil mis à jour par Admin", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur mise à jour par Admin" });
  }
});
// GET /api/auth/me
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
