// src/routes/contactRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";

const router = express.Router();

/* ---------- Health check (utile pour éviter les 404) ---------- */
router.get("/", (_req, res) => {
  res.json({ ok: true });
});

/* ------------------- Anti-spam basique ------------------- */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

/* ------------------- Helpers ------------------- */
const isEmail = (v = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

/* ------------------- POST /api/contact ------------------- */
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: "CHAMPS_REQUIS", details: "name, email, message sont requis" });
    }
    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ error: "EMAIL_INVALIDE", details: "Merci de fournir un email valide" });
    }

    console.log("📨 /api/contact payload:", {
      name: String(name).slice(0, 30),
      email: (email || "").slice(0, 3) + "***",
      msgLen: String(message).length,
    });

    // Adresse de destination (configurable via env)
    const TO = process.env.CONTACT_TO || "2fmn.management@gmail.com";

    // Transport SMTP (Gmail + mot de passe d’application recommandé)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Vérifier la connexion SMTP (optionnel mais pratique)
    await transporter.verify().catch((err) => {
      console.error("❌ SMTP verify error:", err?.message);
      throw new Error("SMTP_VERIFY_FAIL");
    });

    // 1) Mail pour l’admin
    const adminMail = await transporter.sendMail({
      from: `"2FMN Website" <${process.env.EMAIL_USER}>`,
      to: TO,
      replyTo: email,
      subject: `📩 Nouveau message de ${name}`,
      html: `
        <h2>Nouveau message via le site</h2>
        <p><b>Nom :</b> ${escapeHtml(name)}</p>
        <p><b>Email :</b> ${escapeHtml(email)}</p>
        <p><b>Message :</b><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
    });
    console.log("✅ Mail admin envoyé:", adminMail.messageId);

    // 2) Accusé de réception pour le visiteur
    const ackMail = await transporter.sendMail({
      from: `"2FMN Management" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📩 Accusé de réception – 2FMN Management",
      html: `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Nous avons bien reçu votre message et vous répondrons très rapidement.</p>
        <p><b>Récapitulatif :</b></p>
        <blockquote>${escapeHtml(message).replace(/\n/g, "<br/>")}</blockquote>
        <p>— L'équipe 2FMN Management</p>
      `,
    });
    console.log("✅ Mail accusé envoyé:", ackMail.messageId);

    return res.json({ success: true });
  } catch (err) {
    console.error("🔥 /api/contact error:", err);

    if (err?.message === "SMTP_VERIFY_FAIL") {
      return res.status(500).json({
        error: "SMTP_FAIL",
        details:
          "Vérifie EMAIL_USER / EMAIL_PASS (mot de passe d’application Gmail) et l’accès SMTP.",
      });
    }
    return res
      .status(500)
      .json({ error: "SERVEUR", details: "Erreur lors de l’envoi. Réessaie plus tard." });
  }
});

/* ------------------- petit utilitaire anti-injection ------------------- */
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default router;
