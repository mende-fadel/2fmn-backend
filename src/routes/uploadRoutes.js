// src/routes/uploadRoutes.js
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import auth from "../middleware/auth.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Seules les images sont acceptees"));
  },
});

// Config Cloudinary (depuis env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload/image  (body: form-data, field: "file")
router.post("/image", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "NO_FILE" });

    // upload_stream évite d’écrire le fichier sur disque
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "2fmn", resource_type: "image" },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      stream.end(req.file.buffer);
    });

    // result.secure_url / result.public_id
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ error: "UPLOAD_FAIL" });
  }
});

export default router;

