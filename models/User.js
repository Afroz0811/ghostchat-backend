const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username:  { type:String, required:true, unique:true, lowercase:true, trim:true, minlength:3, maxlength:30 },
  password:  { type:String, required:true, minlength:6 },
  avatar:    { type:String, default:"👻" },
  bio:       { type:String, default:"", maxlength:100 },
  status:    { type:String, enum:["online","away","offline"], default:"offline" },
  lastSeen:  { type:Date,   default:Date.now },
  socketId:  { type:String, default:null },
  devices:   [{ deviceId:String, lastActive:Date }],
}, { timestamps:true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublic = function() {
  return { id:this._id, username:this.username, avatar:this.avatar, bio:this.bio, status:this.status, lastSeen:this.lastSeen };
};

module.exports = mongoose.model("User", userSchema);