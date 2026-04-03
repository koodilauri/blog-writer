import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { DEMO_SAVED_POSTS } from '$lib/demo-script.js'

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const isDemo = url.searchParams.has('demo')
  if (isDemo) {
    const post = DEMO_SAVED_POSTS[params.id]
    if (!post) throw error(404, 'Demo post not found')
    return { post }
  }

  const res = await fetch(`/api/posts?id=${params.id}`)
  if (!res.ok) throw error(404, 'Post not found')
  return { post: await res.json() }
}
