const router = require("express").Router();
const https  = require("https");
const auth   = require("../middleware/auth");

const RPCS = [
  "api.mainnet-beta.solana.com",
  "rpc.ankr.com/solana",
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers:{"User-Agent":"Mozilla/5.0"} }, r => {
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
      headers: {"Content-Type":"application/json","Content-Length":Buffer.byteLength(data)}
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    });
    r.on("error", reject);
    r.write(data); r.end();
  });
}

// POST /api/wallet/rpc
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
    const ids = req.query.ids || "solana";
    const data = await httpsGet(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/token-meta?mints=mint1,mint2,...
// Uses Jupiter token list to get name/symbol/logo for Solana tokens
router.get("/token-meta", auth, async (req, res) => {
  try {
    const mints = (req.query.mints || "").split(",").filter(Boolean);
    if (!mints.length) return res.json({});

    // Fetch Jupiter full token list (has 99% of Solana tokens)
    const tokenList = await httpsGet("https://token.jup.ag/all");
    const meta = {};
    tokenList.forEach(t => {
      if (mints.includes(t.address)) {
        meta[t.address] = {
          symbol:  t.symbol,
          name:    t.name,
          logo:    t.logoURI,
          decimals:t.decimals,
        };
      }
    });
    res.json(meta);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/token-price?mints=mint1,mint2
// Uses Jupiter Price API for any Solana token price
router.get("/token-price", auth, async (req, res) => {
  try {
    const mints = req.query.mints || "";
    if (!mints) return res.json({});
    const data = await httpsGet(
      `https://price.jup.ag/v6/price?ids=${mints}`
    );
    // Return simplified { mint: price } map
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
