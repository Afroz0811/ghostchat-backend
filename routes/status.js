const router = require("express").Router();
const auth   = require("../middleware/auth");
const Status = require("../models/Status");

// POST /api/status — create new status
router.post("/", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    const status = await Status.create({
      userId: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar,
      text
    });
    res.json(status);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/status — get all statuses (last 24h)
router.get("/", auth, async (req, res) => {
  try {
    const statuses = await Status.find().sort({ createdAt: -1 }).limit(100);
    res.json(statuses);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
// DELETE /api/status/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ error: "Not found" });
    if (status.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not yours" });
    await status.deleteOne();
    res.json({ message: "Deleted" });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
