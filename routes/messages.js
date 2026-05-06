const router  = require("express").Router();
const Message = require("../models/Message");
const Chat    = require("../models/Chat");
const auth    = require("../middleware/auth");
const { decrypt } = require("../middleware/encryption");

router.get("/:chatId", auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id:req.params.chatId, members:req.user._id });
    if (!chat) return res.status(403).json({ error:"Not a member of this chat" });

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({ chatId:req.params.chatId, deletedAt:null })
      .populate("from", "username avatar")
      .sort({ createdAt:-1 })
      .skip((page-1)*limit)
      .limit(limit);

    const decrypted = messages.reverse().map(msg => {
      const m = msg.toObject();

      if (m.type === "text" && m.text && m.iv) {
        // Decrypt text messages
        try { m.text = decrypt(m.text, m.iv); }
        catch { m.text = "🔒 Could not decrypt"; }
      } else if (m.type === "image") {
        m.text = "📸 Image";
      } else if (m.type === "audio") {
        m.text = "🎤 Voice message";
      } else if (m.type === "document") {
        m.text = `📄 ${m.fileName || "Document"}`;
      }

      delete m.iv;
      return m;
    });

    // Mark as read
    await Message.updateMany(
      { chatId:req.params.chatId, from:{ $ne:req.user._id }, status:{ $ne:"read" } },
      { $set:{ status:"read" }, $addToSet:{ readBy:req.user._id } }
    );

    res.json({ messages:decrypted, page, hasMore: messages.length === limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Server error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const msg = await Message.findOne({ _id:req.params.id, from:req.user._id });
    if (!msg) return res.status(404).json({ error:"Message not found" });
    msg.deletedAt = new Date();
    msg.text      = "";
    await msg.save();
    res.json({ message:"Deleted" });
  } catch (err) {
    res.status(500).json({ error:"Server error" });
  }
});

module.exports = router;
