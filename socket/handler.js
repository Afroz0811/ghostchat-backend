const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const Chat    = require("../models/Chat");
const Message = require("../models/Message");
const { encrypt } = require("../middleware/encryption");

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user; next();
    } catch { next(new Error("Auth failed")); }
  });

  io.on("connection", async (socket) => {
    console.log(`👻 ${socket.user.username} connected`);
    await User.findByIdAndUpdate(socket.user._id, { status:"online", socketId:socket.id, lastSeen:new Date() });
    const chats = await Chat.find({ members:socket.user._id });
    chats.forEach(chat => socket.join(chat._id.toString()));
    socket.broadcast.emit("user:status", { userId:socket.user._id, status:"online" });

    socket.on("message:send", async (data, callback) => {
      try {
        const { chatId, text } = data;
        if (!text?.trim()) return;
        const chat = await Chat.findOne({ _id:chatId, members:socket.user._id });
        if (!chat) return;
        const { encrypted, iv } = encrypt(text.trim());
        const msg = await Message.create({ chatId, from:socket.user._id, text:encrypted, iv, status:"sent" });
        await msg.populate("from", "username avatar");
        await Chat.findByIdAndUpdate(chatId, { lastMessage:{ text:encrypted, iv, from:socket.user._id, time:new Date() } });
        const payload = { ...msg.toObject(), text:text.trim(), iv:undefined };
        io.to(chatId).emit("message:new", payload);
        const onlineMembers = await User.find({ _id:{ $in:chat.members, $ne:socket.user._id }, status:"online" });
        if (onlineMembers.length > 0) {
          await Message.findByIdAndUpdate(msg._id, { status:"delivered" });
          io.to(chatId).emit("message:status", { messageId:msg._id, status:"delivered" });
        }
        if (callback) callback({ success:true, messageId:msg._id });
      } catch (err) { if (callback) callback({ success:false }); }
    });

    socket.on("typing:start", ({ chatId }) => socket.to(chatId).emit("typing:start", { userId:socket.user._id, username:socket.user.username }));
    socket.on("typing:stop",  ({ chatId }) => socket.to(chatId).emit("typing:stop",  { userId:socket.user._id }));
    socket.on("message:read", async ({ chatId }) => {
      await Message.updateMany({ chatId, from:{ $ne:socket.user._id }, status:{ $ne:"read" } }, { $set:{ status:"read" }, $addToSet:{ readBy:socket.user._id } });
      socket.to(chatId).emit("message:read", { chatId, readBy:socket.user._id });
    });
    socket.on("chat:join", ({ chatId }) => socket.join(chatId));
    socket.on("disconnect", async () => {
      await User.findByIdAndUpdate(socket.user._id, { status:"offline", socketId:null, lastSeen:new Date() });
      socket.broadcast.emit("user:status", { userId:socket.user._id, status:"offline" });
    });
  });
};