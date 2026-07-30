import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateToken } from "../middleware/auth";

const router = Router();

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP, GIF) are allowed!"));
    }
  },
});

// Single or multiple file upload endpoint
router.post("/", authenticateToken, upload.array("images", 5), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No image files uploaded" });
    }

    const fileUrls = files.map((file) => `/uploads/${file.filename}`);

    return res.json({
      message: "Images uploaded successfully",
      urls: fileUrls,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

export default router;
