import express from "express";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

router.post("/pay", auth, isAdmin, async (req, res) => {
  console.log("📩 [API] Paiement reçu :", req.body);

  try {
    const { creatorId, amount, method } = req.body;

    // 🔍 Étape 1 - Vérification du créateur
    console.log("🔍 Étape 1 - Recherche du créateur...");
    const creator = await User.findById(creatorId);
    if (!creator) {
      console.log("❌ Créateur introuvable");
      return res.status(404).json({ error: "Créateur introuvable" });
    }
    console.log("✅ Créateur trouvé :", creator.email);

    // 💾 Étape 2 - Sauvegarde du paiement
    console.log("💾 Étape 2 - Enregistrement paiement en base...");
    const payment = new Payment({
      creator: creator._id,
      amount,
      method,
      date: new Date()
    });
    await payment.save();
    console.log("✅ Paiement enregistré avec succès");

    // 🧾 Étape 3 - Génération PDF
    console.log("🧾 Étape 3 - Génération du PDF...");
    const receiptsDir = path.resolve("receipts");
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir);

    const pdfPath = `${receiptsDir}/reçu_${creator.email}_${Date.now()}.pdf`;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));

    const logoPath = path.resolve("public/logo.png");
    console.log("📂 Logo attendu ici :", logoPath);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 70 });
      console.log("✅ Logo ajouté au PDF");
    } else {
      console.log("⚠️ Logo introuvable");
    }

    doc.fontSize(20).text("Reçu de paiement – 2FMN Management Ltd.", 130, 50);
    doc.moveDown();
    doc.fontSize(14).text(`Créateur : ${creator.email}`);
    doc.text(`Montant : ${amount} €`);
    doc.text(`Méthode : ${method}`);
    doc.text(`Date : ${new Date().toLocaleDateString()}`);
    doc.end();

    console.log("✅ PDF généré :", pdfPath);

    // 📧 Étape 4 - Envoi de l'email
    console.log("📧 Étape 4 - Envoi email...");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"2FMN Management" <${process.env.EMAIL_USER}>`,
      to: creator.email,
      subject: "Reçu de votre paiement",
      text: `Bonjour ${creator.email},\n\nVoici votre reçu de paiement pour ${amount} €.\nMerci de faire partie de 2FMN Management.\n\n– L'équipe 2FMN`,
      attachments: [{ filename: "reçu.pdf", path: pdfPath }]
    });

    console.log("✅ Email envoyé !");
    res.json({ message: "✅ Paiement OK + PDF + email !" });

  } catch (err) {
    console.error("🔥 ERREUR DANS /pay :", err);
    res.status(500).json({ error: "❌ Erreur lors du paiement" });
  }
});

router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const payments = await Payment.find().populate("creator", "email");
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "❌ Erreur chargement historique" });
  }
});

export default router;
