// /src/models/CreatorStat.js
const CreatorStatSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", index:true },
  month:   { type:String, index:true },   // "2025-08"
  revenue: { type:Number, default:0 },
  views:   { type:Number, default:0 },
  posts:   { type:Number, default:0 },
  // option: par plateforme
  byPlatform: {
    youtube: { views:Number, revenue:Number },
    tiktok:  { views:Number, revenue:Number },
    instagram:{ reach:Number, revenue:Number },
    snapchat:{ reach:Number, revenue:Number }
  }
}, { timestamps:true });

export default mongoose.model("CreatorStat", CreatorStatSchema);
