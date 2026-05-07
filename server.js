// ── File Download Proxy ────────────────────────────────────────────────────────
app.get("/api/download", async (req, res) => {
  try {
    const { url, name } = req.query;
    if (!url) return res.status(400).json({ error:"No URL" });

    const https  = require("https");
    const http2  = require("http");
    const parsed = new URL(decodeURIComponent(url));
    const client = parsed.protocol === "https:" ? https : http2;

    // Clean filename — remove any extra extensions added by Cloudinary
    let cleanName = name || "file";
    // Remove duplicate extensions like file.xlsx.gif → file.xlsx
    const parts = cleanName.split(".");
    if (parts.length > 2) {
      const knownExts = ["xlsx","xls","pdf","doc","docx","txt","csv","webm","mp3","wav"];
      if (!knownExts.includes(parts[parts.length-1].toLowerCase())) {
        parts.pop(); // remove last extension if not a known type
        cleanName = parts.join(".");
      }
    }

    client.get(decodeURIComponent(url), (fileRes) => {
      if (fileRes.statusCode !== 200) {
        return res.status(fileRes.statusCode).json({ error:"File not found" });
      }
      const contentType = fileRes.headers["content-type"] || "application/octet-stream";
      res.setHeader("Content-Disposition", `attachment; filename="${cleanName}"`);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      fileRes.pipe(res);
    }).on("error", (err) => {
      res.status(500).json({ error:"Download failed" });
    });
  } catch(e) {
    res.status(500).json({ error:"Download failed: " + e.message });
  }
});
