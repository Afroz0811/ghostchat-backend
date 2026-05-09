const express    = require("express");
const http       = require("http");
const https      = require("https");
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
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/status", require("./routes/status"));

// ── Download helper — follows redirects ────────────────────────────────────────
function fetchWithRedirect(url, res, cleanName, maxRedirects) {
  if (maxRedirects === 0) return res.status(500).json({ error:"Too many redirects" });
  https.get(url, (fileRes) => {
    // Follow redirects (Cloudinary uses these for raw files)
    if ([301,302,303,307,308].includes(fileRes.statusCode) && fileRes.headers.location) {
      return fetchWithRedirect(fileRes.headers.location, res, cleanName, maxRedirects - 1);
    }
    if (fileRes.statusCode !== 200) {
      return res.status(fileRes.statusCode).json({ error:"File not found" });
    }
    const contentType = fileRes.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Disposition", `attachment; filename="${cleanName}"`);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    fileRes.pipe(res);
  }).on("error", (err) => {
    console.error("Proxy error:", err);
    res.status(500).json({ error:"Download failed" });
  });
}

// ── File Download Proxy (fixes mobile CORS) ────────────────────────────────────
app.get("/api/download", (req, res) => {
  try {
    const { url, name } = req.query;
    if (!url) return res.status(400).json({ error:"No URL" });

    const decodedUrl = decodeURIComponent(url);

    // Clean filename — remove wrong extensions added by Cloudinary
    let cleanName = name ? decodeURIComponent(name) : "file";
    const parts = cleanName.split(".");
    if (parts.length > 2) {
      const known = ["xlsx","xls","pdf","doc","docx","txt","csv","webm","mp3","wav","mp4","ogg","png","jpg","jpeg","gif"];
      if (!known.includes(parts[parts.length-1].toLowerCase())) {
        parts.pop();
        cleanName = parts.join(".");
      }
    }

    fetchWithRedirect(decodedUrl, res, cleanName, 5);
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
