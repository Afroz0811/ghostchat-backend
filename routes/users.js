const router = require("express").Router();
const User   = require("../models/User");
const auth   = require("../middleware/auth");

router.get("/search", auth, async (req, res) => {
  try {
    const q = req.query.q?.toLowerCase().trim();
    if (!q || q.length < 2) return res.json([]);
    const users = await User.find({ username:{ $regex:q, $options:"i" }, _id:{ $ne:req.user._id } })
      .select("username avatar status bio lastSeen").limit(20);
    res.json(users);
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.get("/me", auth, async (req, res) => { res.json(req.user.toPublic()); });

router.patch("/me", auth, async (req, res) => {
  try {
    const { avatar, bio, status } = req.body;
    if (avatar) req.user.avatar = avatar;
    if (bio !== undefined) req.user.bio = bio;
    if (status && ["online","away","offline"].includes(status)) req.user.status = status;
    await req.user.save();
    res.json(req.user.toPublic());
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username avatar status bio lastSeen");
    if (!user) return res.status(404).json({ error:"User not found" });
    res.json(user);
  } catch (err) { res.status(500).json({ error:"Server error" }); }
});

module.exports = router;