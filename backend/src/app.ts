import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import { env } from "./config/env.js";
import api from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      // allow <img> from this origin to be embedded by the SPA on another port
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin: env.CLIENT_URL.split(","),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (env.NODE_ENV !== "test") app.use(morgan("dev"));

  // Serve uploaded images.
  app.use(`/${env.UPLOAD_DIR}`, express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

  app.use("/api", api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
