// src/models/CreatorStat.js
import mongoose from "mongoose";

/**
 * Statistiques mensuelles d’un créateur par plateforme
 * - clé (user, platform, month) unique pour éviter les doublons
 * - month au format "YYYY-MM"
 */
const CreatorStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["youtube", "instagram", "tiktok", "facebook", "snapchat", "x"],
      required: true,
      index: true,
    },
    month: {
      type: String, // ex: "2025-08"
      required: false,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid month format (expected "YYYY-MM")'],
      index: true,
    },

    // métriques
    followers: { type: Number, default: 0 },   // IG/TikTok/… 
    subscribers: { type: Number, default: 0 }, // YouTube
    views: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },     // € pour ce mois/plateforme
  },
  { timestamps: true }
);

// Évite les doublons (un enregistrement par user + plateforme + mois)
CreatorStatSchema.index({ user: 1, platform: 1, month: 1 }, { unique: true, sparse: true });

const CreatorStat = mongoose.model("CreatorStat", CreatorStatSchema);
export default CreatorStat;
