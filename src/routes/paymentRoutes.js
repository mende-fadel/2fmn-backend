// src/routes/paymentRoutes.js
import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const router = express.Router();

// POST /api/payments/pay  → enregistre + PDF + email
router.post("/pay", auth, isAdmin, async (req, res) => {
  try {
    const { creatorId, amount, method, period, note } = req.body;

    console.log("📩 [API] Paiement reçu :", { creatorId, amount, method, period });

    // 1) Créateur
    const creator = await User.findById(creatorId);
    if (!creator) return res.status(404).json({ error: "Créateur introuvable" });
    console.log("✅ Créateur trouvé :", creator.email);

    // 2) Enregistrer paiement
    const payment = await Payment.create({
      creator: creator._id,
      amount,
      method: method || "virement",
      period,
      note,
      date: new Date(),
    });
    console.log("✅ Paiement enregistré avec succès");

    // 3) Générer PDF
    const receiptsDir = path.resolve("receipts");
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir);

    const safeEmail = creator.email.replace(/[^\w.@-]/g, "_");
    const pdfPath = path.join(
      receiptsDir,
      `reçu_${safeEmail}_${Date.now()}.pdf`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(fs.createWriteStream(pdfPath));

    // logo (optionnel)
    const logoPath = path.resolve("public/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 70 });
    }
    doc.fontSize(20).text("Reçu de paiement – 2FMN Management Ltd.", 120, 50);
    doc.moveDown(2);

    doc.fontSize(12).text(`Créateur : ${creator.email}`);
    if (period) doc.text(`Période : ${period}`);
    if (note) doc.text(`Note : ${note}`);
    doc.text(`Montant : ${amount} €`);
    doc.text(`Méthode : ${method || "virement"}`);
    doc.text(`Date : ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text("Merci pour votre collaboration.", { align: "left" });

    doc.end();
    console.log("✅ PDF généré :", pdfPath);

    // 4) Envoi d'email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"2FMN Management" <${process.env.EMAIL_USER}>`,
      to: creator.email,
      subject: "Votre reçu de paiement",
      text: `Bonjour,\n\nVeuillez trouver ci-joint votre reçu de paiement de ${amount} €.\n\n— 2FMN Management`,
      attachments: [{ filename: "reçu.pdf", path: pdfPath }],
    });
    console.log("✅ Email envoyé");

    res.json({ message: "OK", payment });
  } catch (err) {
    console.error("🔥 Erreur paiement:", err);
    res.status(500).json({ error: "Erreur lors du paiement" });
  }
});

// GET /api/payments  → historique (admin uniquement)
router.get("/", auth, isAdmin, async (_req, res) => {
  try {
    const payments = await Payment.find().populate("creator", "email").sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement historique" });
  }
});

export default router;
