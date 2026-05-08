const router = require("express").Router();
const https  = require("https");
const auth   = require("../middleware/auth");

const RPCS = [
  "api.mainnet-beta.solana.com",
  "rpc.ankr.com/solana",
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers:{"User-Agent":"GhostChat/1.0"} }, r => {
      let raw = "";
      r.on("data", c => raw += c);
      r.on("end", () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    }).on("error", reject);
  });
}

function rpcPost(host, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const r = https.request({
      hostname: host, path: "/", method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(data),
        "User-Agent":     "GhostChat/1.0"
      }
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    });
    r.on("error", reject);
    r.write(data); r.end();
  });
}

// POST /api/wallet/rpc — proxy Solana RPC
router.post("/rpc", auth, async (req, res) => {
  const { method, params } = req.body;
  if (!method) return res.status(400).json({ error:"method required" });
  for (const host of RPCS) {
    try {
      const result = await rpcPost(host, { jsonrpc:"2.0", id:1, method, params });
      if (result?.result !== undefined) return res.json(result);
    } catch(e) { continue; }
  }
  res.status(503).json({ error:"All RPC endpoints failed" });
});

// GET /api/wallet/price?ids=solana
router.get("/price", auth, async (req, res) => {
  try {
    const ids  = req.query.ids || "solana";
    const data = await httpsGet(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/token-meta?mints=mint1,mint2
// Returns name, symbol, logo for each mint using Jupiter token list
router.get("/token-meta", auth, async (req, res) => {
  try {
    const mints = (req.query.mints || "").split(",").filter(Boolean);
    if (!mints.length) return res.json({});

    const tokenList = await httpsGet("https://token.jup.ag/all");
    const meta = {};
    tokenList.forEach(t => {
      if (mints.includes(t.address)) {
        meta[t.address] = {
          symbol:   t.symbol,
          name:     t.name,
          logo:     t.logoURI,
          decimals: t.decimals,
        };
      }
    });
    res.json(meta);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/token-price?mints=mint1,mint2
// Returns { mint: price } using Jupiter Price API v6
router.get("/token-price", auth, async (req, res) => {
  try {
    const mints = req.query.mints || "";
    if (!mints) return res.json({});

    const data = await httpsGet(
      `https://price.jup.ag/v6/price?ids=${mints}`
    );

    // Convert to simple { mint: price } map
    const prices = {};
    Object.entries(data?.data || {}).forEach(([id, info]) => {
      prices[id] = info.price || 0;
    });
    res.json(prices);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
