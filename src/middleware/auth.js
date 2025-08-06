import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Accès refusé" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: "Token invalide" });
  }
}
