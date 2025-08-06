import User from "../models/User.js";

export default async function isAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé – Admin uniquement" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
}
