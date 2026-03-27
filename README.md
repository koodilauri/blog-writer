# BlogWriter

An AI-powered blog post generator built with SvelteKit and deployed to Cloudflare Workers. Provide a topic, choose a format and tone, and a multi-agent pipeline researches sources, drafts, fact-checks, and edits the post — with human-in-the-loop review at key stages.

## Features

- **Multi-agent pipeline** — query generation, source fetching & scoring, outlining, writing, fact-checking, editing, and SEO metadata, each as a separate LangGraph node
- **Streaming output** — draft appears token-by-token via SSE; pipeline progress shown in real time
- **Human-in-the-loop** — pause at source review (approve/reject/add URLs) and outline review before writing continues
- **Fact-checker** — highlights revised sentences inline with click-to-inspect tooltips
- **Session persistence** — in-progress runs survive page refresh via Cloudflare R2 checkpoints
- **Post history** — saved posts load into the main view with full content, sources, and SEO metadata
- **Five formats** — blog post, essay, tutorial, story, scientific abstract
- **Five tones** — formal, funny, for kids, scientific, inspirational
- **JWT auth** — single-user password login with a signed cookie

## Stack

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | SvelteKit 2 (Svelte 5)                   |
| Deployment       | Cloudflare Workers + R2                  |
| AI orchestration | LangGraph (`@langchain/langgraph`)       |
| LLM              | Anthropic Claude / OpenAI (configurable) |
| Styling          | Tailwind CSS v4, Inter + DM Sans + Lora  |
| UI primitives    | bits-ui                                  |
| Auth             | `jose` (JWT)                             |

## Getting started

**Prerequisites:** Node.js 20+, pnpm, a Cloudflare account, and API keys for Anthropic and/or OpenAI.

```sh
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

### Environment variables

Set these as Cloudflare Worker secrets (via `wrangler secret put`) or in a `.dev.vars` file for local development:

| Variable            | Description                                    |
| ------------------- | ---------------------------------------------- |
| `LOGIN_EMAIL`       | Email address for the single-user login        |
| `LOGIN_PASSWORD`    | Password for the single-user login             |
| `JWT_SECRET`        | Secret key used to sign session tokens         |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude models)              |
| `OPENAI_API_KEY`    | OpenAI API key (optional, if using GPT models) |
| `OPENAI_MODEL`      | OpenAI model name (optional)                   |

### Cloudflare R2

The app stores generation checkpoints and saved posts in an R2 bucket. Create one and update `wrangler.jsonc`:

```sh
wrangler r2 bucket create post-writer-checkpoints
```

The bucket binding is already configured in `wrangler.jsonc` as `R2`.

## Deployment

```sh
pnpm deploy
```

This runs `vite build` then `wrangler deploy`.

## Project structure

```
src/
├── lib/
│   ├── agents/          # Individual LangGraph agent nodes
│   │   ├── query-generator.ts
│   │   ├── source-fetcher.ts
│   │   ├── source-scorer.ts
│   │   ├── source-approval.ts
│   │   ├── outliner.ts
│   │   ├── writer.ts
│   │   ├── fact-checker.ts
│   │   ├── editor.ts
│   │   └── seo.ts
│   ├── graph.ts         # LangGraph workflow definition
│   └── auth.ts          # JWT helpers
└── routes/
    ├── api/
    │   ├── generate/    # SSE stream endpoint
    │   ├── resume/      # Resume an interrupted run
    │   ├── session/     # Save/load in-progress session
    │   └── posts/       # CRUD for saved posts
    └── generate/
        └── +page.svelte # Main UI
```
