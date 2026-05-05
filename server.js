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
const socketHandler = require("./socket/handler");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/",         (req, res) => res.json({ status:"GhostChat API running 👻", version:"1.0.0" }));
app.use("/api/auth", authRoutes);
app.use("/api/chats",    chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users",    userRoutes);

// ── Socket.io ─────────────────────────────────────────────────────────────────
socketHandler(io);

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 GhostChat server on port ${PORT}`));
