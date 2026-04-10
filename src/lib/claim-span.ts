export type RevisionRange = { start: number; end: number; noteIndex: number }

export function findClaimSpan(draft: string, claim: string): { start: number; end: number } | null {
  const dLow = draft.toLowerCase()
  const cLow = claim.toLowerCase().trim()
  const exact = dLow.indexOf(cLow)
  if (exact !== -1) return { start: exact, end: exact + cLow.length }
  const claimWords = cLow.match(/\w+/g) ?? []
  if (claimWords.length < 4) return null
  const anchor = claimWords[0]!
  const lastW = claimWords[claimWords.length - 1]!
  let pos = 0
  let bestRange: { start: number; end: number } | null = null
  let bestScore = 0.6
  while (true) {
    const anchorPos = dLow.indexOf(anchor, pos)
    if (anchorPos === -1) break
    const windowEnd = Math.min(draft.length, anchorPos + Math.ceil(claim.length * 1.5))
    const window = dLow.slice(anchorPos, windowEnd)
    const windowWords = new Set(window.match(/\w+/g) ?? [])
    const score = claimWords.filter(w => windowWords.has(w)).length / claimWords.length
    if (score > bestScore) {
      bestScore = score
      const lastInWindow = window.lastIndexOf(lastW)
      const end =
        lastInWindow !== -1
          ? anchorPos + lastInWindow + lastW.length
          : Math.min(draft.length, anchorPos + claim.length)
      bestRange = { start: anchorPos, end: end }
    }
    pos = anchorPos + 1
  }
  return bestRange
}

export function findRevisionRanges(
  draft: string,
  notes: string[],
  skipIndices?: Set<number>
): RevisionRange[] {
  const parts = draft.split(/(\n\n+)/)
  const paragraphs: { text: string; start: number; end: number }[] = []
  let pOffset = 0
  for (const part of parts) {
    if (!/^\n+$/.test(part) && part.trim()) {
      paragraphs.push({ text: part, start: pOffset, end: pOffset + part.length })
    }
    pOffset += part.length
  }
  const ranges: RevisionRange[] = []
  for (let ni = 0; ni < notes.length; ni++) {
    if (skipIndices?.has(ni)) continue
    const claimMatch = notes[ni].match(/^Claim:\s*"([^"]+)"/)
    if (claimMatch) {
      const span = findClaimSpan(draft, claimMatch[1])
      if (span) {
        ranges.push({ ...span, noteIndex: ni })
        continue
      }
    }
    const matchText = claimMatch ? claimMatch[1] : notes[ni]
    const matchWords = matchText.toLowerCase().match(/\w+/g) ?? []
    if (!matchWords.length) continue
    let bestPara: (typeof paragraphs)[0] | null = null
    let bestRatio = 0.38
    for (const para of paragraphs) {
      const paraWords = new Set(para.text.toLowerCase().match(/\w+/g) ?? [])
      const hits = matchWords.filter(w => paraWords.has(w)).length
      const ratio = hits / matchWords.length
      if (ratio > bestRatio) {
        bestRatio = ratio
        bestPara = para
      }
    }
    if (bestPara) {
      ranges.push({ start: bestPara.start, end: bestPara.end, noteIndex: ni })
    }
  }
  return ranges
}

export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderHighlighted(text: string, ranges: RevisionRange[]): string {
  if (!ranges.length) return escHtml(text)
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  let out = ''
  let pos = 0
  for (const r of sorted) {
    if (r.start > pos) out += escHtml(text.slice(pos, r.start))
    out += `<mark class="rev-mark" data-note="${r.noteIndex}">${escHtml(text.slice(r.start, r.end))}</mark>`
    pos = r.end
  }
  if (pos < text.length) out += escHtml(text.slice(pos))
  return out
}
