<script lang="ts">
  type Props = {
    url: string
    title: string
    score: number
    checked: boolean
    ontoggle: () => void
  }
  let { url, title, score, checked, ontoggle }: Props = $props()
</script>

<li class="source-item">
  <input type="checkbox" {checked} onchange={ontoggle} class="source-check" />
  <span class="score-badge" class:high={score >= 4} class:mid={score === 3} class:low={score < 3}
    >{score}/5</span
  >
  <a href={url} target="_blank" rel="noopener noreferrer" class="source-link">{title || url}</a>
</li>

<style>
  .source-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .source-check {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    cursor: pointer;
    accent-color: #4f46e5;
  }
  .score-badge {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .score-badge.high {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }
  .score-badge.mid {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
  .score-badge.low {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }
  .source-link {
    font-size: 0.8rem;
    color: #818cf8;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
</style>
