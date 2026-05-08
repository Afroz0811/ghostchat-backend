const router = require("express").Router();
const https  = require("https");
const auth   = require("../middleware/auth");

const RPCS = [
  "api.mainnet-beta.solana.com",
  "rpc.ankr.com/solana",
];

function rpcPost(host, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: host,
      path: path || "/",
      method: "POST",
      headers: { "Content-Type":"application/json", "Content-Length":Buffer.byteLength(data) }
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error("Invalid JSON")); }
      });
    });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

// POST /api/wallet/rpc
router.post("/rpc", auth, async (req, res) => {
  const { method, params } = req.body;
  if (!method) return res.status(400).json({ error:"method required" });
  for (const host of RPCS) {
    try {
      const result = await rpcPost(host, "/", { jsonrpc:"2.0", id:1, method, params });
      if (result?.result !== undefined) return res.json(result);
    } catch(e) { continue; }
  }
  res.status(503).json({ error:"All RPC endpoints failed" });
});

// GET /api/wallet/price?ids=solana
router.get("/price", auth, async (req, res) => {
  const ids = req.query.ids || "solana";
  const result = await new Promise((resolve, reject) => {
    https.get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, r => {
      let raw = "";
      r.on("data", c => raw += c);
      r.on("end", () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    }).on("error", reject);
  });
  res.json(result);
});

module.exports = router;