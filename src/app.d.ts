// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '$lib/types/auth'
declare global {
  namespace App {
    interface Platform {
      env: Env
      cf: CfProperties
      ctx: ExecutionContext
    }

    // interface Error {}
    interface Locals {
      user: User | null
    }
    // interface PageData {}
    // interface PageState {}
  }
}

export {}
