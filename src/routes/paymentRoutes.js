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

// POST /api/payments/pay
router.post("/pay", auth, isAdmin, async (req, res) => {
  try {
    const { creatorId, amount, method, period, note } = req.body;

    const creator = await User.findById(creatorId);
    if (!creator) return res.status(404).json({ error: "Createur introuvable" });

    const payment = await Payment.create({
      creator: creator._id,
      amount,
      method: method || "virement",
      period,
      note,
      date: new Date(),
    });

    // Generate PDF
    const receiptsDir = path.resolve("receipts");
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir);

    const safeEmail = creator.email.replace(/[^\w.@-]/g, "_");
    const pdfPath = path.join(receiptsDir, `recu_${safeEmail}_${Date.now()}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const logoPath = path.resolve("public/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 70 });
    }
    doc.fontSize(20).text("Recu de paiement - 2FMN Management Ltd.", 120, 50);
    doc.moveDown(2);

    doc.fontSize(12).text(`Createur : ${creator.email}`);
    if (period) doc.text(`Periode : ${period}`);
    if (note) doc.text(`Note : ${note}`);
    doc.text(`Montant : ${amount} EUR`);
    doc.text(`Methode : ${method || "virement"}`);
    doc.text(`Date : ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.text("Merci pour votre collaboration.", { align: "left" });

    doc.end();

    // Wait for PDF to be fully written before sending email
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Send email with PDF attachment
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"2FMN Management" <${process.env.EMAIL_USER}>`,
      to: creator.email,
      subject: "Votre recu de paiement - 2FMN Management",
      text: `Bonjour,\n\nVeuillez trouver ci-joint votre recu de paiement de ${amount} EUR.\n\n-- 2FMN Management`,
      attachments: [{ filename: "recu.pdf", path: pdfPath }],
    });

    // Clean up PDF file after sending
    fs.unlink(pdfPath, () => {});

    res.json({ message: "OK", payment });
  } catch (err) {
    console.error("Erreur paiement:", err);
    res.status(500).json({ error: "Erreur lors du paiement" });
  }
});

// GET /api/payments
router.get("/", auth, isAdmin, async (_req, res) => {
  try {
    const payments = await Payment.find().populate("creator", "email").sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement historique" });
  }
});

export default router;
