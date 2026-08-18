# BlogWriter

An AI-powered blog post generator built with SvelteKit and deployed to Cloudflare Workers. Provide a topic, choose a format, tone, and length, and a multi-agent pipeline researches sources, drafts, fact-checks, and edits the post with human-in-the-loop review at key stages.

Link to demo https://blog-writer.lako.workers.dev/generate?demo

## Features

- **Multi-agent pipeline** — query generation, source fetching & scoring, outlining, writing, fact-checking, editing, and SEO metadata, each as a separate LangGraph node
- **Live streaming over WebSocket** — the draft appears token-by-token and pipeline progress arrives in real time over a single WebSocket connection to a Durable Object
- **Human-in-the-loop** — the graph interrupts at source review (approve/reject/add URLs), outline review, and fact-checker review before continuing
- **Fact-checker** — highlights revised sentences inline with click-to-inspect tooltips; the writer/fact-checker loop runs up to three revisions
- **Session persistence** — in-progress runs survive page refresh and disconnects: LangGraph checkpoints are written to R2, and reconnecting to the same run id resumes from the last checkpoint
- **Web research** — sources come from the Brave Search API, then get scored for relevance (an empty result set sends the graph back to query generation)
- **Post history** — saved posts load into the main view with full content, sources, and SEO metadata, plus a standalone `/preview/[id]` page
- **Demo mode** — `?demo` replays a scripted run with no API keys required
- **Five formats** — blog post, essay, tutorial, story, scientific abstract
- **Five tones** — formal and informative, funny, for kids, scientific, inspirational
- **Four lengths** — short (~300) through in-depth (~2500 words)
- **JWT auth** — single-user password login with a signed cookie

## Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Framework        | SvelteKit 2 (Svelte 5)                            |
| Deployment       | Cloudflare Workers + Durable Objects + R2         |
| AI orchestration | LangGraph (`@langchain/langgraph`)                |
| LLM              | Anthropic Claude / OpenAI / Ollama (configurable) |
| Search           | Brave Search API                                  |
| Styling          | Tailwind CSS v4, Inter + DM Sans + Lora           |
| UI primitives    | bits-ui                                           |
| Validation       | zod (schemas in `src/lib/schemas/`)               |
| Auth             | `jose` (JWT)                                      |
| Logging          | pino                                              |
| Testing          | Vitest (unit), Playwright (e2e)                   |

## Architecture

The browser opens a WebSocket to `/api/pipeline?runId=<uuid>`. That SvelteKit endpoint verifies the JWT cookie, validates the run id, and forwards the upgrade request to a `PipelineDurableObject` addressed by run id. The Durable Object runs the LangGraph graph, streams stage events and model tokens back over the socket, and checkpoints every step into R2 via `R2CheckpointSaver`. Interrupts (sources, outline, fact-checker) are sent as `interrupt` events; the client replies with a `resume` message carrying the approved values.

Because `adapter-cloudflare` owns `src/worker.ts`, the Durable Object export is appended to it after `vite build` by `scripts/inject-do.js`. Since that happens at build time, the Durable Object is **not** available under `pnpm dev` see [Local development](#local-development-dev-vs-preview).

## Getting started

**Prerequisites:** Node.js 20+, pnpm, a Cloudflare account, a Brave Search API key, and API keys for Anthropic and/or OpenAI (or a local Ollama running `llama3.2`).

```sh
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Other useful scripts: `pnpm test` (unit tests), `pnpm test:e2e` (Playwright), `pnpm check` (svelte-check), `pnpm lint`, `pnpm preview` (build + `wrangler dev`).

### Local development: `dev` vs `preview`

There are two ways to run the app locally, and they use different runtimes serving different bundles:

|                                     | `pnpm dev`            | `pnpm preview`                 |
| ----------------------------------- | --------------------- | ------------------------------ |
| Runtime                             | Node, via Vite        | workerd (production semantics) |
| Entry point                         | SvelteKit's dev entry | the built `src/worker.ts`      |
| Durable Object / pipeline WebSocket | ✗ not exported        | ✓ works                        |
| Secrets from                        | `.env`                | `.dev.vars`                    |
| HMR                                 | ✓                     | ✗ (rebuild per change)         |
| Port                                | 5173                  | 8787                           |

`pnpm dev` runs your source through Vite in Node with HMR; `src/worker.ts` is never used. Bindings are emulated by a miniflare proxy that reads `wrangler.jsonc`, so R2 works, but `PIPELINE_DO` does not. The binding is declared while the class is not exported from what's being served.

`pnpm preview` runs `vite build` (which injects the Durable Object export via `scripts/inject-do.js`) and then serves that bundle with `wrangler dev` in workerd.

**Use `dev`** for UI work and anything reachable through `?demo`. **Use `preview`** for a real generation run, the pipeline WebSocket, or checkpoint/resume behavior.

#### The Durable Object warning is expected

Under `pnpm dev` and `pnpm test:e2e`, wrangler and workerd both warn that `PipelineDurableObject` is bound but "no such Durable Object class is exported from the worker". This is the situation described above and is harmless in those commands: the Playwright suite in `e2e/` drives demo mode against the mocked SSE stream at `src/routes/api/demo/+server.ts` and never opens the pipeline WebSocket. A non-demo run under `pnpm dev` will genuinely fail to reach the pipeline so switch to `pnpm preview` for that.

### Environment variables

The same variables are read from a different place depending on how you're running:

- **`pnpm dev`** reads `.env` (via `$env/dynamic/private`)
- **`pnpm preview`** reads `.dev.vars` it does **not** read `.env`
- **Production** reads Cloudflare Worker secrets set with `wrangler secret put`

See `.env.sample` for the full set. To use `pnpm preview` after setting up `.env`:

```sh
cp .env .dev.vars
```

Both `.env` and `.dev.vars` are gitignored. Note that `USE_OPENAI` is also set under `vars` in `wrangler.jsonc`, so in `preview` and production it comes from there rather than from your secrets file.

| Variable               | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `LOGIN_EMAIL`          | Email address for the single-user login                            |
| `LOGIN_PASSWORD`       | Password for the single-user login                                 |
| `JWT_SECRET`           | Secret key used to sign session tokens                             |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key used by the source fetcher                    |
| `USE_CLAUDE`           | `"true"` to use Anthropic Claude                                   |
| `ANTHROPIC_API_KEY`    | Anthropic API key (required when `USE_CLAUDE=true`)                |
| `USE_OPENAI`           | `"true"` to use OpenAI (checked after `USE_CLAUDE`)                |
| `OPENAI_API_KEY`       | OpenAI API key (required when `USE_OPENAI=true`)                   |
| `OPENAI_MODEL`         | OpenAI model name (optional, defaults to `gpt-4o-mini`)            |
| `LOG_LEVEL`            | `debug` for full LLM message content, `info` for stage transitions |

With both `USE_CLAUDE` and `USE_OPENAI` unset or `"false"`, the app falls back to Ollama at `http://localhost:11434`.

### Cloudflare bindings

The app stores generation checkpoints and saved posts in an R2 bucket. Create one and keep it in sync with `wrangler.jsonc`:

```sh
wrangler r2 bucket create post-writer-checkpoints
```

`wrangler.jsonc` already configures the R2 binding as `R2`, the Durable Object binding as `PIPELINE_DO` (class `PipelineDurableObject`, SQLite migration `v1`), and the static asset binding as `ASSETS`.

## Deployment

```sh
pnpm deploy
```

This runs `vite build`, injects the Durable Object export, then `wrangler deploy`.

## Project structure

```
src/
├── lib/
│   ├── agents/              # LangGraph nodes
│   │   ├── query-generator.ts
│   │   ├── source-fetcher.ts
│   │   ├── source-scorer.ts
│   │   ├── source-approval.ts     # human-in-the-loop interrupt
│   │   ├── outliner.ts
│   │   ├── outliner-approval.ts   # human-in-the-loop interrupt
│   │   ├── writer.ts
│   │   ├── fact-checker.ts
│   │   ├── fact-checker-approval.ts
│   │   ├── editor.ts
│   │   ├── seo.ts
│   │   └── types.ts               # GraphState definition
│   ├── components/          # Svelte UI, with ui/ holding the primitives
│   ├── schemas/             # zod schemas (draft, events, login, posts, session)
│   ├── server/auth.ts       # password check / token issuing
│   ├── graph.ts             # LangGraph workflow definition
│   ├── pipeline-do.ts       # PipelineDurableObject: WebSocket + graph runner
│   ├── r2-checkpointer.ts   # LangGraph checkpoint saver backed by R2
│   ├── langgraph-interrupt.ts
│   ├── claim-span.ts        # locate fact-checked claims in the draft
│   ├── model.ts             # Claude / OpenAI / Ollama selection
│   ├── demo-script.ts       # scripted run for ?demo
│   ├── activity-labels.ts
│   ├── auth.ts              # JWT helpers
│   └── logger.ts, llm-logger.ts, utils.ts, cf-env-shim.ts
├── routes/
│   ├── api/
│   │   ├── pipeline/        # WebSocket upgrade → Durable Object
│   │   ├── session/         # Save/load in-progress session
│   │   ├── posts/           # CRUD for saved posts
│   │   ├── login/, logout/  # JWT cookie auth
│   │   └── demo/            # Scripted SSE demo stream
│   ├── generate/            # Topic/format/tone entry form
│   ├── drafts/[id]/         # Live run view (WebSocket client)
│   ├── preview/[id]/        # Read-only saved post view
│   └── login/
├── hooks.server.ts          # Auth guard
└── worker.ts                # Cloudflare entrypoint (generated + DO export)
```
