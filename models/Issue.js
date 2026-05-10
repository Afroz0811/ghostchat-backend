const mongoose = require("mongoose");
const IssueSchema = new mongoose.Schema({
  type:        { type: String, required: true },
  description: { type: String, required: true },
  username:    String,
  userId:      String,
  status:      { type: String, default: "open" }, // open, reviewing, fixed
  adminNote:   String,
  logs:        Array,
  meta:        Object,
  timestamp:   { type: Date, default: Date.now }
});
module.exports = mongoose.model("Issue", IssueSchema);