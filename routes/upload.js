const router     = require("express").Router();
const multer     = require("multer");
const cloudinary = require("cloudinary").v2;
const auth       = require("../middleware/auth");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg","image/png","image/gif","image/webp",
      "application/pdf","application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "audio/webm","audio/ogg","audio/wav","audio/mp4","audio/mpeg","audio/mp3"
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  }
});

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const mime    = req.file.mimetype;
    const isImage = mime.startsWith("image/");
    const isAudio = mime.startsWith("audio/");
    const type    = isImage ? "image" : isAudio ? "audio" : "document";

    const options = {
      folder:        "ghostchat",
      resource_type: isAudio ? "video" : isImage ? "image" : "raw",
      public_id:     `${Date.now()}-${Math.round(Math.random()*1e6)}`,
    };

    const result = await uploadToCloudinary(req.file.buffer, options);

    res.json({
      url:      result.secure_url,
      filename: req.file.originalname,
      size:     req.file.size,
      mimetype: mime,
      type,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

module.exports = router;