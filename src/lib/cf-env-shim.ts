// Shim for $env/dynamic/private in Cloudflare Workers contexts (Durable Objects).
// Wrangler aliases this module for DO bundling; SvelteKit routes use the real
// $env/dynamic/private resolved at Vite build time (this shim is never loaded there).
export { env } from 'cloudflare:workers'
