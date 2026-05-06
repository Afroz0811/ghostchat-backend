const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatId:    { type:mongoose.Schema.Types.ObjectId, ref:"Chat", required:true, index:true },
  from:      { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
  text:      { type:String, default:"" },
  iv:        { type:String, default:"" },
  type:      { type:String, enum:["text","image","document","audio"], default:"text" },
  fileUrl:   { type:String, default:null },
  fileName:  { type:String, default:null },
  fileSize:  { type:Number, default:null },
  edited:    { type:Boolean, default:false },
  status:    { type:String, enum:["sent","delivered","read"], default:"sent" },
  readBy:    [{ type:mongoose.Schema.Types.ObjectId, ref:"User" }],
  deletedAt: { type:Date, default:null },
}, { timestamps:true });

module.exports = mongoose.model("Message", messageSchema);
