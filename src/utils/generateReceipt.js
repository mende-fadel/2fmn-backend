import PDFDocument from "pdfkit";
import fs from "fs";

export const generateReceipt = (payment) => {
  return new Promise((resolve, reject) => {
    const filePath = `./receipts/receipt-${payment._id}.pdf`;
    const doc = new PDFDocument({ margin: 50 });

    // 📄 Sauvegarder le PDF sur le serveur
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ✅ 🔵 AJOUTER LE LOGO EN HAUT
    try {
      doc.image("Logo.png", 50, 30, { width: 100 })  // 📥 Mets ton logo dans /public ou /uploads
        .moveDown();
    } catch (e) {
      console.log("⚠️ Logo introuvable, vérifier le chemin.");
    }

    // ✅ Titre
    doc.fontSize(20).text("2FMN Ltd", 160, 40, { align: "left" });
    doc.moveDown();
    doc.fontSize(16).text("📄 Reçu de Paiement", { align: "center" });
    doc.moveDown();

    // ✅ Infos de paiement
    doc.fontSize(12).text(`Créateur : ${payment.creatorEmail}`);
    if (payment.creatorName) {
      doc.text(`Nom : ${payment.creatorName}`);
    }
    doc.text(`Montant : €${payment.amount}`);
    doc.text(`Date : ${new Date(payment.date).toLocaleDateString()}`);
    doc.text(`Référence : ${payment._id}`);
    doc.moveDown();

    // ✅ Ligne de séparation
    doc.moveDown().lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // ✅ Message de remerciement
    doc.moveDown();
    doc.fontSize(10).text(
      "Merci pour votre collaboration avec 2FMN Ltd.\nCe reçu confirme la transaction effectuée.",
      { align: "center" }
    );

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
};
