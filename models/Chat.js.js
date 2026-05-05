const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  type:      { type:String, enum:["dm","group"], required:true },
  name:      { type:String, default:"" },
  avatar:    { type:String, default:"👥" },
  members:   [{ type:mongoose.Schema.Types.ObjectId, ref:"User" }],
  admins:    [{ type:mongoose.Schema.Types.ObjectId, ref:"User" }],
  lastMessage: {
    text:    String,
    iv:      String,
    from:    { type:mongoose.Schema.Types.ObjectId, ref:"User" },
    time:    Date,
  },
  encrypted: { type:Boolean, default:true },
  autoDelete:{ type:Number,  default:0 },
}, { timestamps:true });

module.exports = mongoose.model("Chat", chatSchema);