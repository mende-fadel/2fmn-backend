import mongoose from "mongoose";

/**
 * Avis client déposé depuis le site.
 * - Créé en "pending", affiché seulement une fois passé en "published" par un admin.
 * - L'email sert à vérifier l'auteur, il n'est jamais renvoyé par la route publique.
 */
const ReviewSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
    activity: { type: String, trim: true, maxlength: 100, default: "" }, // ex. "Conciergerie Airbnb", "Créatrice TikTok"
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, trim: true, maxlength: 1500 },
    status: {
      type: String,
      enum: ["pending", "published", "rejected"],
      default: "pending",
      index: true,
    },
    publishedAt: { type: Date },
    // Renseigné quand un avis est refusé : MongoDB le supprime automatiquement à cette date.
    expireAt: { type: Date },
  },
  { timestamps: true }
);

ReviewSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Nom affiché sur le site : prénom + initiale du nom ("Awa D.").
ReviewSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    name: `${this.firstName} ${this.lastName.charAt(0).toUpperCase()}.`,
    activity: this.activity,
    rating: this.rating,
    message: this.message,
    date: this.createdAt,
  };
};

export default mongoose.model("Review", ReviewSchema);
