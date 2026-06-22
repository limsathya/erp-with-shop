import multer from "multer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { env } from "../config/env.js";
import { HttpError } from "../utils/asyncHandler.js";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`);
  },
});

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(415, "Only JPG, PNG, WEBP or GIF images are allowed"));
  },
});

/** Build a public URL for a stored file. */
export const fileUrl = (filename: string) => `${env.PUBLIC_URL}/${env.UPLOAD_DIR}/${filename}`;
