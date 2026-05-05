# 👻 GhostChat Backend

Anonymous, encrypted real-time chat backend built with Node.js, Socket.io, MongoDB.

## Features
- 🔒 AES-256 message encryption
- 👻 Anonymous accounts (username + password only)
- ⚡ Real-time messaging via Socket.io
- 💾 Encrypted message backup in MongoDB
- 👥 DM + Group chats
- ✓✓ Read receipts & typing indicators
- 📱 Multi-device support

---

## 🚀 Deploy to Railway (Step by Step)

### Step 1 — Get Free MongoDB
1. Go to **mongodb.com/atlas** → Sign up free
2. Create a free cluster (M0 — forever free)
3. Click **Connect** → **Connect your application**
4. Copy the connection string → looks like:
   `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ghostchat`

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "GhostChat backend"
git remote add origin https://github.com/YOUR_USERNAME/ghostchat-backend.git
git push -u origin main
```

### Step 3 — Deploy on Railway
1. Go to **railway.app** → Sign up free (with GitHub)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `ghostchat-backend` repo
4. Railway auto-detects Node.js and deploys!

### Step 4 — Add Environment Variables on Railway
In your Railway project → **Variables** tab → add these:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Any long random string (e.g. `ghostchat-jwt-super-secret-2024-xyz`) |
| `ENCRYPTION_SECRET` | Any long random string (e.g. `ghostchat-aes-key-2024-abc`) |

Railway sets `PORT` automatically — don't add it.

### Step 5 — Get Your API URL
Railway gives you a public URL like:
`https://ghostchat-backend-production.up.railway.app`

That's your backend! Use it in your frontend.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | `{username, password, avatar}` | Create account |
| POST | `/api/auth/login`  | `{username, password}` | Login |
| POST | `/api/auth/logout` | — | Logout |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get my profile |
| GET | `/api/users/search?q=name` | Search users |
| PATCH | `/api/users/me` | Update profile |

### Chats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chats` | Get all my chats |
| POST | `/api/chats/dm` | Start DM `{userId}` |
| POST | `/api/chats/group` | Create group `{name, members[]}` |
| DELETE | `/api/chats/:id` | Leave/delete chat |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:chatId` | Get messages (paginated) |
| DELETE | `/api/messages/:id` | Delete message |

### Socket Events
| Event | Direction | Data |
|---|---|---|
| `message:send` | Client → Server | `{chatId, text}` |
| `message:new` | Server → Client | message object |
| `message:status` | Server → Client | `{messageId, status}` |
| `message:read` | Client → Server | `{chatId}` |
| `typing:start` | Client → Server | `{chatId}` |
| `typing:stop` | Client → Server | `{chatId}` |
| `user:status` | Server → Client | `{userId, status}` |

---

## 🔒 Security Features
- Passwords hashed with bcrypt (12 rounds)
- Messages encrypted with AES-256-CBC before storing
- JWT tokens expire in 30 days
- No emails, no phone numbers stored
- Zero PII in the database
