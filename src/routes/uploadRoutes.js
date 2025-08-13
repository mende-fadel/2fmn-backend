import express from "express";
import multer from "multer";
import crypto from "crypto";
import fetch from "node-fetch";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/image", upload.single("file"), async (req, res) => {
  try {
    const ts = Math.floor(Date.now() / 1000);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = "2fmn";

    const toSign = `folder=${folder}&timestamp=${ts}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    const form = new FormData();
    form.append("file", req.file.buffer, "upload.jpg");
    form.append("api_key", apiKey);
    form.append("timestamp", String(ts));
    form.append("signature", signature);
    form.append("folder", folder);

    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json(data);
    res.json(data); // { secure_url, public_id, ... }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "UPLOAD_FAIL" });
  }
});

export default router;
