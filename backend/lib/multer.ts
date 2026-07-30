import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images (JPEG, PNG, WEBP, GIF) and PDF files are allowed"));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 3, // max 3 attachments
  },
  fileFilter,
});

// Helper to parse multipart via multer in Next.js route handlers
// Since Next.js App Router doesn't have req/res in the Express sense,
// we use a helper that wraps the multer middleware
export function runMulter(
  req: import("http").IncomingMessage,
  res: import("http").ServerResponse
): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.array("attachments", 3)(req as any, res as any, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
