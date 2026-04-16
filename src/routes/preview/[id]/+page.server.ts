import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { DEMO_SAVED_POSTS } from '$lib/demo-script.js'
import { PostIdSchema, SavedPostSchema } from '$lib/schemas/posts'

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const idResult = PostIdSchema.safeParse(params.id)
  if (!idResult.success) throw error(400, 'Invalid post id')
  const id = idResult.data

  const isDemo = url.searchParams.has('demo')
  if (isDemo) {
    const post = DEMO_SAVED_POSTS[id]
    if (!post) throw error(404, 'Demo post not found')
    return { post }
  }

  const res = await fetch(`/api/posts?id=${id}`)
  if (!res.ok) throw error(404, 'Post not found')
  return { post: SavedPostSchema.parse(await res.json()) }
}
