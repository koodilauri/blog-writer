import { describe, it, expect } from 'vitest'
import { findClaimSpan } from './claim-span'

describe('findClaimSpan', () => {
  it('matches a claim verbatim, ignoring case', () => {
    const draft = 'The Sky is blue today.'
    const span = findClaimSpan(draft, 'sky is blue')
    expect(span).toEqual({ start: 4, end: 15 })
    expect(draft.slice(span!.start, span!.end)).toBe('Sky is blue')
  })

  it('falls back to a fuzzy window when the claim is paraphrased', () => {
    const draft = 'Renewable energy adoption grew by twelve percent last year across Europe.'
    const span = findClaimSpan(draft, 'energy adoption grew twelve percent')
    expect(draft.slice(span!.start, span!.end)).toBe('energy adoption grew by twelve percent')
  })

  it('returns null for a short claim that is not present verbatim', () => {
    expect(findClaimSpan('Hello world, this is a draft.', 'totally absent')).toBeNull()
  })

  it('returns null when no window overlaps the claim enough', () => {
    const draft = 'The cat sat on the mat and watched the rain.'
    expect(findClaimSpan(draft, 'quantum entanglement of distant particles')).toBeNull()
  })
})
