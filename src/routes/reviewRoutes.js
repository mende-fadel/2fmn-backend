import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import Review from "../models/Review.js";

const router = express.Router();

const ADMIN_URL = "https://2fmnmanagementltd.eu/admin/avis";

const isEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

// GET /api/reviews : avis publiés + note moyenne (public)
router.get("/", async (_req, res) => {
  try {
    const reviews = await Review.find({ status: "published" }).sort({ createdAt: -1 }).limit(60);
    const count = reviews.length;
    const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    res.json({
      count,
      average: Math.round(average * 10) / 10,
      reviews: reviews.map((r) => r.toPublic()),
    });
  } catch (err) {
    console.error("/api/reviews GET error:", err);
    res.status(500).json({ error: "SERVEUR" });
  }
});

// POST /api/reviews : dépôt d'un avis (public, limité, en attente de validation)
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skipFailedRequests: true, // une erreur de saisie ne compte pas dans la limite
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TROP_DE_DEMANDES", details: "Trop d'envois, réessayez dans quelques minutes." },
});

router.post("/", submitLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    // Piège à robots : un humain ne voit pas ce champ. On fait comme si tout allait bien.
    if (body.website) return res.status(201).json({ ok: true });

    const firstName = clean(body.firstName, 60);
    const lastName = clean(body.lastName, 60);
    const email = clean(body.email, 200);
    const activity = clean(body.activity, 100);
    const message = clean(body.message, 1500);
    const rating = Number(body.rating);

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: "CHAMPS_REQUIS", details: "Prénom, nom, email et avis sont requis." });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: "EMAIL_INVALIDE", details: "Merci de fournir un email valide." });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "NOTE_INVALIDE", details: "Choisissez une note de 1 à 5 étoiles." });
    }
    if (message.length < 20) {
      return res.status(400).json({ error: "AVIS_TROP_COURT", details: "Votre avis doit faire au moins 20 caractères." });
    }
    if (body.consent !== true) {
      return res.status(400).json({ error: "CONSENTEMENT", details: "Merci d'accepter la publication de votre avis." });
    }

    const review = await Review.create({ firstName, lastName, email, activity, rating, message });

    // Prévient l'agence, sans bloquer la réponse si l'email échoue.
    notifyAdmin(review).catch((err) => console.error("Review email error:", err?.message));

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("/api/reviews POST error:", err);
    res.status(500).json({ error: "SERVEUR", details: "Erreur lors de l'envoi. Réessayez plus tard." });
  }
});

// ===== Admin =====

// GET /api/reviews/admin?status=pending|published|rejected
router.get("/admin", auth, isAdmin, async (req, res) => {
  try {
    const filter = ["pending", "published", "rejected"].includes(req.query.status)
      ? { status: req.query.status }
      : {};
    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(200);
    const counts = await Review.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    res.json({
      reviews,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  } catch (err) {
    console.error("/api/reviews/admin error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH /api/reviews/admin/:id  { status }
router.patch("/admin/:id", auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["pending", "published", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000;
    const update = {
      status,
      publishedAt: status === "published" ? new Date() : null,
      expireAt: status === "rejected" ? new Date(Date.now() + SIX_MONTHS) : null,
    };
    const review = await Review.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!review) return res.status(404).json({ error: "Avis introuvable" });
    res.json(review);
  } catch (err) {
    console.error("/api/reviews/admin PATCH error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/reviews/admin/:id
router.delete("/admin/:id", auth, isAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Avis introuvable" });
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/reviews/admin DELETE error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

async function notifyAdmin(review) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  await transporter.sendMail({
    from: `"2FMN Website" <${process.env.EMAIL_USER}>`,
    to: process.env.CONTACT_TO || "2fmn.management@gmail.com",
    replyTo: review.email,
    subject: `Nouvel avis à valider : ${stars} de ${review.firstName} ${review.lastName}`,
    html: `
      <h2>Nouvel avis en attente de validation</h2>
      <p><b>${escapeHtml(review.firstName)} ${escapeHtml(review.lastName)}</b> (${escapeHtml(review.email)})
      ${review.activity ? `<br/>${escapeHtml(review.activity)}` : ""}</p>
      <p style="font-size:20px;color:#f47b20;">${stars}</p>
      <p style="background:#f9f9f9;padding:15px;border-radius:5px;">${escapeHtml(review.message).replace(/\n/g, "<br/>")}</p>
      <p><a href="${ADMIN_URL}">Publier ou refuser cet avis</a></p>
    `,
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default router;
