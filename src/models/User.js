// backend/src/models/User.js
import mongoose from "mongoose";

/**
 * Modèle Utilisateur (Admin & Creator)
 * - Profils détaillés pour les créateurs
 * - Réseaux sociaux + métriques de base
 * - KPIs globaux (revenus/vues/campagnes) pour l’admin
 */

const SocialSubSchema = new mongoose.Schema(
  {
    handle: { type: String, trim: true },
    url: { type: String, trim: true },
    // métriques
    subscribers: { type: Number, default: 0 }, // YouTube
    followers: { type: Number, default: 0 },   // IG/TikTok
    views: { type: Number, default: 0 },       // YouTube
    likes: { type: Number, default: 0 }        // TikTok (optionnel)
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "creator"], default: "creator", index: true },

    // Profil
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    profilePic: { type: String, trim: true }, // URL (Cloudinary/S3 ou /images/...)
    bio: { type: String, trim: true, maxlength: 2000 },

    // Réseaux sociaux (snapshot actuel)
    socials: {
      youtube: SocialSubSchema,
      tiktok: SocialSubSchema,
      instagram: SocialSubSchema,
      snapchat: SocialSubSchema
    },

    // KPIs globaux (affichés dans admin)
    revenus: { type: Number, default: 0 },    // total lifetime (si tu veux)
    vues: { type: Number, default: 0 },       // total lifetime
    campagnes: { type: Number, default: 0 }   // nombre de campagnes actives/total
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
