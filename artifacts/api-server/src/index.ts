import app from "./app";
import { logger } from "./lib/logger";
import { initEngine } from "./lib/matchEngine";
import { startAgent } from "./lib/sharpDetector";
import { ensureDevnetFunds } from "./lib/solanaAnchor";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// initEngine is async (tries TxLINE live match list, falls back to local schedule)
initEngine()
  .then(() => startAgent())
  .catch((err) => {
    logger.error({ err }, "Engine init failed — starting agent anyway");
    startAgent();
  });

// Provision Solana devnet wallet in background
ensureDevnetFunds().catch((err) => logger.warn({ err }, "Devnet fund provisioning failed"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
