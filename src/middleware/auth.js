import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (!token) return res.status(401).json({ error: "Accès refusé (token manquant)" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;      // { id, role, ... } si tu l'inclus au sign
    next();
  } catch (error) {
    return res.status(400).json({ error: "Token invalide" });
  }
}
