import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import ContactMessage from "../models/ContactMessage.js";

const router = express.Router();

// Limiter anti-abus (ex: 10 posts / 10 min par IP)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/", limiter, async (req, res) => {
  try {
    const { name, email, subject, message, hp } = req.body;

    // honeypot -> stop spam bots
    if (hp && hp.trim() !== "") {
      return res.status(200).json({ ok: true }); // faire comme si tout va bien
    }

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }

    // 1) Sauvegarde DB
    const doc = await ContactMessage.create({ name, email, subject, message });

    // 2) Transport mail (Gmail App Password ou SMTP pro)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER, // ex: 2fmn.management@gmail.com
        pass: process.env.EMAIL_PASS  // mot de passe d’application
      }
    });

    // 3) Email interne (à vous)
    await transporter.sendMail({
      from: `"2FMN Website" <${process.env.EMAIL_USER}>`,
      to: process.env.CONTACT_INBOX || process.env.EMAIL_USER,
      subject: `📬 Nouveau message – ${subject}`,
      replyTo: email,
      text:
`Nom: ${name}
Email: ${email}
Sujet: ${subject}

Message:
${message}

— ID: ${doc._id}`,
      html: `
        <h2>Nouveau message reçu</h2>
        <p><b>Nom:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Sujet:</b> ${subject}</p>
        <pre style="white-space:pre-wrap;font-family:inherit">${message}</pre>
        <hr/>
        <p style="color:#666">ID: ${doc._id} • ${new Date(doc.createdAt).toLocaleString()}</p>
      `
    });

    // 4) Accusé de réception à l’expéditeur
    await transporter.sendMail({
      from: `"2FMN Management" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📫 Nous avons bien reçu votre message",
      text:
`Bonjour ${name},

Merci d’avoir contacté 2FMN Management Ltd.
Nous avons bien reçu votre message (“${subject}”) et revenons vers vous très vite.

— L’équipe 2FMN
https://2fmnmanagementltd.com`,
      html: `
        <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;line-height:1.5">
          <h2>Merci, ${name} 👋</h2>
          <p>Nous avons bien reçu votre message (<i>${subject}</i>).</p>
          <p>Un membre de l’équipe vous répondra rapidement.</p>
          <p>— 2FMN Management Ltd<br/>
          <a href="https://2fmnmanagementltd.com">2fmnmanagementltd.com</a></p>
        </div>
      `
    });

    return res.json({ ok: true, message: "Message envoyé. Merci !" });
  } catch (err) {
    console.error("Contact error:", err);
    return res.status(500).json({ error: "Envoi impossible pour le moment." });
  }
});

export default router;
