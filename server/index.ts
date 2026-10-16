import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { initDb } from "./db";
import { storage } from "./storage";

const isProd = process.env.NODE_ENV === "production";
const app = express();
const httpServer = createServer(app);

// Render and Railway sit behind one proxy: trust it so secure cookies and
// per-IP rate limits see the real client.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    // Vite's dev server injects inline scripts, so the strict policy only applies in production.
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
          },
        }
      : false,
  }),
);

app.use(express.json({ limit: "100kb" }));

export function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${time} [${source}] ${message}`);
}

// Log API requests without bodies, so no passwords, cookies or bet data end up in logs.
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const start = Date.now();
  res.on("finish", () => log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`));
  next();
});

(async () => {
  await initDb();
  await storage.deleteExpiredSessions();

  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("Request error:", err);
    if (res.headersSent) return next(err);
    // Don't leak internal error details to the browser.
    res.status(status).json({ message: status < 500 ? err.message : "Something went wrong" });
  });

  if (isProd) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => log(`serving on port ${port}`));
})().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
