import pino from 'pino'

// Uses a custom write fn instead of process.stdout so it works in both
// Node.js (dev) and Cloudflare Workers with nodejs_compat (production).
// All output goes through console.log, which Cloudflare observability captures.
export const logger = pino(
  { level: process.env.LOG_LEVEL ?? 'info' },
  { write: (msg: string) => console.log(msg.trimEnd()) }
)
