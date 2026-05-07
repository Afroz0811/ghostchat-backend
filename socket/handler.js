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

    // ── SEND MESSAGE ──────────────────────────────────────────────────────────
    socket.on("message:send", async (data, callback) => {
      try {
        const { chatId, text, type, fileUrl, fileName, fileSize } = data;
        if (!text?.trim() && !fileUrl) return;
        const chat = await Chat.findOne({ _id:chatId, members:socket.user._id });
        if (!chat) return;

        let msgData = { chatId, from:socket.user._id, type:type||"text", status:"sent" };

        if (fileUrl) {
          msgData.fileUrl  = fileUrl;
          msgData.fileName = fileName || "file";
          msgData.fileSize = fileSize || 0;
          msgData.text     = "";
          msgData.iv       = "";
        } else {
          const { encrypted, iv } = encrypt(text.trim());
          msgData.text = encrypted;
          msgData.iv   = iv;
        }

        const msg = await Message.create(msgData);
        await msg.populate("from", "username avatar");

        const lastText = fileUrl
          ? (type==="image" ? "📸 Image" : type==="audio" ? "🎤 Voice message" : `📄 ${fileName}`)
          : text.trim();

        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: { text:lastText, iv:"", from:socket.user._id, time:new Date() }
        });

        const payload = { ...msg.toObject(), text: fileUrl ? lastText : text?.trim(), iv:undefined };
        io.to(chatId).emit("message:new", payload);

        const onlineMembers = await User.find({
          _id: { $in:chat.members, $ne:socket.user._id }, status:"online"
        });
        if (onlineMembers.length > 0) {
          await Message.findByIdAndUpdate(msg._id, { status:"delivered" });
          io.to(chatId).emit("message:status", { messageId:msg._id, status:"delivered" });
        }
        if (callback) callback({ success:true, messageId:msg._id });
      } catch (err) {
        console.error("message:send error", err);
        if (callback) callback({ success:false });
      }
    });

    // ── TYPING ────────────────────────────────────────────────────────────────
    socket.on("typing:start", ({ chatId }) => socket.to(chatId).emit("typing:start", { userId:socket.user._id, username:socket.user.username }));
    socket.on("typing:stop",  ({ chatId }) => socket.to(chatId).emit("typing:stop",  { userId:socket.user._id }));

    // ── READ ──────────────────────────────────────────────────────────────────
    socket.on("message:read", async ({ chatId }) => {
      await Message.updateMany(
        { chatId, from:{ $ne:socket.user._id }, status:{ $ne:"read" } },
        { $set:{ status:"read" }, $addToSet:{ readBy:socket.user._id } }
      );
      socket.to(chatId).emit("message:read", { chatId, readBy:socket.user._id });
    });

    // ── JOIN CHAT ─────────────────────────────────────────────────────────────
    socket.on("chat:join", ({ chatId }) => socket.join(chatId));

    // ── VOICE CALL SIGNALING ──────────────────────────────────────────────────
    socket.on("call:initiate", async ({ chatId, to }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:incoming", {
            from:     socket.user._id,
            username: socket.user.username,
            avatar:   socket.user.avatar,
            chatId,
          });
        }
      } catch(e) { console.error("call:initiate error", e); }
    });

    socket.on("call:accept", async ({ to, chatId }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:accepted", {
            from: socket.user._id, chatId
          });
        }
      } catch(e) { console.error("call:accept error", e); }
    });

    socket.on("call:reject", async ({ to }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:rejected", {
            from: socket.user._id
          });
        }
      } catch(e) { console.error("call:reject error", e); }
    });

    socket.on("call:end", async ({ to }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:ended", {
            from: socket.user._id
          });
        }
      } catch(e) { console.error("call:end error", e); }
    });

    socket.on("call:offer", async ({ to, offer }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:offer", {
            from: socket.user._id, offer
          });
        }
      } catch(e) { console.error("call:offer error", e); }
    });

    socket.on("call:answer", async ({ to, answer }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:answer", {
            from: socket.user._id, answer
          });
        }
      } catch(e) { console.error("call:answer error", e); }
    });

    socket.on("call:ice", async ({ to, candidate }) => {
      try {
        const targetUser = await User.findById(to);
        if (targetUser?.socketId) {
          io.to(targetUser.socketId).emit("call:ice", {
            from: socket.user._id, candidate
          });
        }
      } catch(e) { console.error("call:ice error", e); }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`👋 ${socket.user.username} disconnected`);
      await User.findByIdAndUpdate(socket.user._id, {
        status:   "offline",
        socketId: null,
        lastSeen: new Date()
      });
      socket.broadcast.emit("user:status", { userId:socket.user._id, status:"offline" });
    });
  });
};
