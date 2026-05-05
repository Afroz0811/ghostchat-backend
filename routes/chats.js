const router  = require("express").Router();
const Chat    = require("../models/Chat");
const Message = require("../models/Message");
const auth    = require("../middleware/auth");
const { decrypt } = require("../middleware/encryption");

router.get("/", auth, async (req, res) => {
  try {
    const chats = await Chat.find({ members:req.user._id })
      .populate("members", "username avatar status lastSeen")
      .populate("lastMessage.from", "username avatar")
      .sort({ "lastMessage.time":-1, updatedAt:-1 });
    const result = chats.map(chat => {
      const c = chat.toObject();
      if (c.lastMessage?.text && c.lastMessage?.iv) {
        try { c.lastMessage.text = decrypt(c.lastMessage.text, c.lastMessage.iv); }
        catch { c.lastMessage.text = "🔒 Encrypted message"; }
      }
      return c;
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.post("/dm", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error:"userId required" });
    let chat = await Chat.findOne({ type:"dm", members:{ $all:[req.user._id, userId], $size:2 } })
      .populate("members", "username avatar status lastSeen");
    if (!chat) {
      chat = await Chat.create({ type:"dm", members:[req.user._id, userId] });
      chat = await chat.populate("members", "username avatar status lastSeen");
    }
    res.json(chat);
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.post("/group", auth, async (req, res) => {
  try {
    const { name, members, avatar } = req.body;
    if (!name || !members?.length) return res.status(400).json({ error:"Name and members required" });
    const allMembers = [...new Set([req.user._id.toString(), ...members])];
    const chat = await Chat.create({ type:"group", name, avatar:avatar||"👥", members:allMembers, admins:[req.user._id] });
    await chat.populate("members", "username avatar status");
    res.status(201).json(chat);
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error:"Chat not found" });
    if (chat.type==="dm") { await Message.deleteMany({ chatId:chat._id }); await chat.deleteOne(); }
    else {
      chat.members = chat.members.filter(m => m.toString()!==req.user._id.toString());
      if (chat.members.length===0) { await Message.deleteMany({ chatId:chat._id }); await chat.deleteOne(); }
      else await chat.save();
    }
    res.json({ message:"Done" });
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

module.exports = router;