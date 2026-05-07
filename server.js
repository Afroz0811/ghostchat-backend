const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const cors       = require("cors");
const dotenv     = require("dotenv");

dotenv.config();

const authRoutes    = require("./routes/auth");
const chatRoutes    = require("./routes/chats");
const messageRoutes = require("./routes/messages");
const userRoutes    = require("./routes/users");
const uploadRoutes  = require("./routes/upload");
const socketHandler = require("./socket/handler");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status:"GhostChat API running 👻", version:"1.0.0" }));
app.use("/api/auth",     authRoutes);
app.use("/api/chats",    chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/upload",   uploadRoutes);

// ── File Download Proxy (fixes mobile CORS issue) ──────────────────────────────
app.get("/api/download", async (req, res) => {
  try {
    const { url, name } = req.query;
    if (!url) return res.status(400).json({ error:"No URL provided" });

    const https  = require("https");
    const http2  = require("http");
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http2;

    client.get(url, (fileRes) => {
      const contentType = fileRes.headers["content-type"] || "application/octet-stream";
      res.setHeader("Content-Disposition", `attachment; filename="${name || "file"}"`);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      fileRes.pipe(res);
    }).on("error", (err) => {
      console.error("Download proxy error:", err);
      res.status(500).json({ error:"Download failed" });
    });
  } catch(e) {
    console.error("Download error:", e);
    res.status(500).json({ error:"Download failed: " + e.message });
  }
});

// ── Socket.io ──────────────────────────────────────────────────────────────────
socketHandler(io);

// ── MongoDB ────────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 GhostChat server on port ${PORT}`));
