import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ ok: true });
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

const isEmail = (v = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, company, subject, message } = req.body || {};

    if (!firstName || !lastName || !email || !subject || !message) {
      return res
        .status(400)
        .json({ error: "CHAMPS_REQUIS", details: "firstName, lastName, email, subject, message sont requis" });
    }
    if (!isEmail(email)) {
      return res
        .status(400)
        .json({ error: "EMAIL_INVALIDE", details: "Merci de fournir un email valide" });
    }

    console.log("/api/contact payload:", {
      name: `${String(firstName).slice(0, 15)} ${String(lastName).slice(0, 15)}`,
      email: (email || "").slice(0, 3) + "***",
      subject: String(subject).slice(0, 40),
      msgLen: String(message).length,
    });

    const TO = process.env.CONTACT_TO || "2fmn.management@gmail.com";

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify().catch((err) => {
      console.error("SMTP verify error:", err?.message);
      throw new Error("SMTP_VERIFY_FAIL");
    });

    const fullName = `${firstName} ${lastName}`;

    // Mail to admin
    await transporter.sendMail({
      from: `"2FMN Website" <${process.env.EMAIL_USER}>`,
      to: TO,
      replyTo: email,
      subject: `Nouveau message de ${fullName} - ${subject}`,
      html: `
        <h2>Nouveau message via le site 2FMN</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Nom</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(fullName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(email)}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Telephone</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td></tr>` : ""}
          ${company ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Entreprise</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(company)}</td></tr>` : ""}
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Sujet</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(subject)}</td></tr>
        </table>
        <h3 style="margin-top:20px;">Message :</h3>
        <p style="background:#f9f9f9;padding:15px;border-radius:5px;">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
    });

    // Acknowledgement to visitor
    await transporter.sendMail({
      from: `"2FMN Management" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Accuse de reception - 2FMN Management",
      html: `
        <p>Bonjour ${escapeHtml(firstName)},</p>
        <p>Nous avons bien recu votre message et nous vous repondrons dans les plus brefs delais.</p>
        <p><b>Recapitulatif :</b></p>
        <p><b>Sujet :</b> ${escapeHtml(subject)}</p>
        <blockquote style="background:#f9f9f9;padding:15px;border-left:3px solid #00bcd4;margin:10px 0;">${escapeHtml(message).replace(/\n/g, "<br/>")}</blockquote>
        <p>Cordialement,<br/>L'equipe 2FMN Management</p>
      `,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("/api/contact error:", err);

    if (err?.message === "SMTP_VERIFY_FAIL") {
      return res.status(500).json({
        error: "SMTP_FAIL",
        details: "Erreur de configuration email. Veuillez reessayer plus tard.",
      });
    }
    return res
      .status(500)
      .json({ error: "SERVEUR", details: "Erreur lors de l'envoi. Reessayez plus tard." });
  }
});

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default router;
