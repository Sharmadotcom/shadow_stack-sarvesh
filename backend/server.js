// Custom Next.js server with node-cron SLA escalation scheduler
// Run with: node server.js (NOT next dev / next start)
// Required so that node-cron runs persistently alongside Next.js

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const cron = require("node-cron");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // ─── Import escalation engine (dynamic import for ESM/CJS compat) ──────────
  let runEscalationCheck;
  try {
    // In production (built), import from compiled output
    const mod = require("./.next/server/chunks/escalation.js");
    runEscalationCheck = mod.runEscalationCheck;
  } catch {
    // In dev, use ts-node transpiled version via a wrapper
    console.warn(
      "[server.js] Could not load compiled escalation module — using dev wrapper"
    );
  }

  // ─── Schedule SLA escalation check every 5 minutes ────────────────────────
  if (runEscalationCheck) {
    cron.schedule("*/5 * * * *", async () => {
      try {
        await runEscalationCheck();
      } catch (err) {
        console.error("[CRON] Escalation check failed:", err);
      }
    });
    console.log("[CRON] SLA escalation scheduler started (every 5 minutes)");
  } else {
    console.warn(
      "[CRON] Escalation check not loaded — cron not scheduled. Use /api/admin/escalation/trigger to run manually."
    );
  }

  // ─── HTTP server ───────────────────────────────────────────────────────────
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  })
    .once("error", (err) => {
      console.error("[server.js] Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Mode: ${dev ? "development" : "production"}`);
      console.log(`> SLA escalation cron: ${runEscalationCheck ? "active" : "inactive"}`);
    });
});
