const router = require("express").Router();
const auth   = require("../middleware/auth");
const Issue  = require("../models/Issue");

// POST /api/issues — submit a report
router.post("/", auth, async (req, res) => {
  try {
    const issue = await Issue.create({ ...req.body, userId: req.user._id, username: req.user.username });
    res.json(issue);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/issues/mine — get my own reports
router.get("/mine", auth, async (req, res) => {
  try {
    const issues = await Issue.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(20);
    res.json(issues);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/issues/all — admin: get all reports (only shaiz08)
router.get("/all", auth, async (req, res) => {
  if (req.user.username !== "shaiz08") return res.status(403).json({ error: "Admin only" });
  try {
    const issues = await Issue.find().sort({ timestamp: -1 }).limit(100);
    res.json(issues);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/issues/:id — admin: update status + reply
router.patch("/:id", auth, async (req, res) => {
  if (req.user.username !== "shaiz08") return res.status(403).json({ error: "Admin only" });
  try {
    const issue = await Issue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(issue);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;