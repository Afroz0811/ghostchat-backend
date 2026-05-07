const router = require("express").Router();
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn:"30d" });

router.post("/signup", async (req, res) => {
  try {
    const { username, password, avatar } = req.body;
    if (!username || !password) return res.status(400).json({ error:"Username and password required" });
    if (username.length < 3) return res.status(400).json({ error:"Username must be 3+ characters" });
    if (password.length < 6) return res.status(400).json({ error:"Password must be 6+ characters" });
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(409).json({ error:"Username already taken" });
    const user  = await User.create({ username, password, avatar: avatar || "👻" });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error:"Username and password required" });
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(401).json({ error:"Invalid username or password" });
    const match = await user.comparePassword(password);
    if (!match)  return res.status(401).json({ error:"Invalid username or password" });
    user.status = "online"; user.lastSeen = new Date(); await user.save();
    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.post("/logout", require("../middleware/auth"), async (req, res) => {
  try {
    req.user.status = "offline"; req.user.lastSeen = new Date(); await req.user.save();
    res.json({ message:"Logged out successfully" });
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});
// DELETE /api/auth/account — permanently delete account
router.delete("/account", require("../middleware/auth"), async (req, res) => {
  try {
    const userId = req.user._id;
    // Delete all messages sent by user
    await require("../models/Message").deleteMany({ from: userId });
    // Remove user from all chats
    const Chat = require("../models/Chat");
    await Chat.updateMany({ members: userId }, { $pull: { members: userId } });
    // Delete empty chats
    await Chat.deleteMany({ members: { $size: 0 } });
    // Delete user
    await require("../models/User").findByIdAndDelete(userId);
    res.json({ message: "Account deleted successfully" });
  } catch(err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
