import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { upload, fileUrl } from "../middleware/upload.js";

const router = Router();

// POST /api/upload  (multipart/form-data, field name: "file")
router.post(
  "/",
  authenticate,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded");
    res.status(201).json({ url: fileUrl(req.file.filename), filename: req.file.filename });
  })
);

export default router;
