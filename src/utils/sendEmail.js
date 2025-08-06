import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text, attachments = []) => {
  try {
    // 📧 CONFIG SMTP (exemple Gmail - on pourra utiliser un SMTP Pro après)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // ✅ ton email Gmail (ou pro)
        pass: process.env.EMAIL_PASS  // ✅ ton mot de passe ou App Password
      }
    });

    // 📩 Envoi
    await transporter.sendMail({
      from: `"2FMN Ltd" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      attachments
    });

    console.log("✅ Email envoyé à", to);
  } catch (error) {
    console.error("❌ Erreur envoi email:", error);
  }
};
