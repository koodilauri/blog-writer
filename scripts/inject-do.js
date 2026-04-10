// Appended after vite build because adapter-cloudflare owns src/worker.ts.
// The Durable Object class must be exported from the worker entrypoint.
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const workerPath = resolve('src/worker.ts')
const content = readFileSync(workerPath, 'utf8')

const doExport = `\nexport { PipelineDurableObject } from "./lib/pipeline-do.js";\n`

if (content.includes('PipelineDurableObject')) {
  console.log('[inject-do] DO export already present, skipping.')
} else {
  writeFileSync(workerPath, content + doExport)
  console.log('[inject-do] Injected PipelineDurableObject export into src/worker.ts')
}
