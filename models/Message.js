const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatId:    { type:mongoose.Schema.Types.ObjectId, ref:"Chat", required:true, index:true },
  from:      { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  text:      { type:String, required:true },
  iv:        { type:String, required:true },
  type:      { type:String, enum:["text","image","file"], default:"text" },
  status:    { type:String, enum:["sent","delivered","read"], default:"sent" },
  readBy:    [{ type:mongoose.Schema.Types.ObjectId, ref:"User" }],
  deletedAt: { type:Date, default:null },
}, { timestamps:true });

module.exports = mongoose.model("Message", messageSchema);