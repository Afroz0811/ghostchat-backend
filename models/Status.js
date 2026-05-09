const mongoose = require("mongoose");
const StatusSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: String,
  avatar:   String,
  text:     String,
  createdAt:{ type: Date, default: Date.now, expires: 86400 } // auto-delete after 24h
});
module.exports = mongoose.model("Status", StatusSchema);