export type DemoStep = { delay: number; data: Record<string, unknown> }

// ── Pre-recorded content ─────────────────────────────────────────────────────

const OUTLINE = `# How AI Coding Assistants Are Changing Software Development

## Introduction
- Hook: two years of widespread adoption — time for an honest assessment
- Thesis: reality is more nuanced than the hype or the backlash

## 1. Speed Is Real, but It's Not the Whole Story
- Studies: up to 55% faster task completion in controlled experiments
- What AI doesn't speed up: system design, debugging, legacy code comprehension
- Net effect: compresses execution time, frees cognitive bandwidth for harder problems

## 2. The Junior Developer Effect
- Early fears about short-circuiting learning appear overblown
- AI expands the surface area of what less experienced devs can attempt
- Best practice: treat AI output as a first draft, not a final answer

## 3. The New Skill: Prompt Engineering for Code
- Describing a problem precisely is becoming as valuable as writing code
- AI as a fast but inexperienced pair programmer
- The key differentiator: judgment and steering, not typing speed

## 4. What Hasn't Changed
- Data structures, debugging, architectural reasoning remain human work
- As writing code gets cheaper, reasoning about what to build gets more valuable
- Thriving developers: strategic delegation, not wholesale automation

## Conclusion
- The balance: use AI to move faster, keep humans in the loop for what matters`

const FIRST_DRAFT = `# How AI Coding Assistants Are Changing Software Development

The arrival of AI coding assistants like GitHub Copilot, Cursor, and Claude has sparked endless debate in developer communities. Are they making us lazier? More productive? Both? After two years of widespread adoption, we're finally starting to see the real picture — and it's more nuanced than either the hype or the backlash suggested.

## Speed Is Real, but It's Not the Whole Story

The most obvious benefit is raw speed. Studies show that developers using AI coding tools complete tasks up to 55% faster. For repetitive boilerplate — writing tests, scaffolding CRUD endpoints, converting data shapes — the productivity gains are tangible and real.

But speed isn't everything. Experienced developers increasingly report that the *thinking* part of their job hasn't shrunk at all. Designing systems, debugging subtle race conditions, understanding legacy codebases: these tasks remain stubbornly human. What AI has done is compress the time between "I know what I need to build" and "it's built," freeing cognitive bandwidth for harder problems.

## The Junior Developer Effect

One of the most debated outcomes is how AI assistants affect less experienced developers. Early fears that they would short-circuit learning appear overblown — juniors still struggle with the same conceptual gaps. What's changed is the *surface area* of what they can attempt.

A junior developer today can spin up a working API with authentication, write a suite of unit tests, and deploy to a cloud provider in a single afternoon — tasks that once required weeks of accumulated knowledge. The best outcomes come when AI-generated code is treated as a first draft to be understood, not a final answer to be shipped.

## The New Skill: Prompt Engineering for Code

A quieter shift is happening in what it means to be a skilled developer. The ability to describe a problem precisely, break it into tractable pieces, and evaluate generated output critically is becoming as valuable as the ability to write the code itself.

Senior developers who have adapted best tend to treat AI like a fast but inexperienced pair programmer: great at suggesting approaches, poor at knowing which approach fits *this* codebase, *this* team, *this* constraint. The skill is in the steering.

## What Hasn't Changed

Despite the transformation, the fundamentals remain stubbornly relevant. Understanding data structures, reading error messages, knowing when *not* to add complexity — these haven't been automated away. As AI lowers the cost of writing code, the ability to reason about what code *should* do becomes more valuable, not less.

The developers thriving in this environment aren't the ones who've handed the wheel to AI. They're the ones who've figured out exactly how much of the wheel to hand over.`

const REVISED_DRAFT = `# How AI Coding Assistants Are Changing Software Development

The arrival of AI coding assistants like GitHub Copilot, Cursor, and Claude has sparked endless debate in developer communities. Are they making us lazier? More productive? Both? After two years of widespread adoption, we're finally starting to see the real picture — and it's more nuanced than either the hype or the backlash suggested.

## Speed Is Real, but It's Not the Whole Story

The most obvious benefit is raw speed. According to a GitHub-commissioned study, developers using Copilot completed tasks up to 55% faster in controlled experiments. For repetitive boilerplate — writing tests, scaffolding CRUD endpoints, converting data shapes — the productivity gains are tangible and real.

But speed isn't everything. Experienced developers increasingly report that the *thinking* part of their job hasn't shrunk at all. Designing systems, debugging subtle race conditions, understanding legacy codebases: these tasks remain stubbornly human. What AI has done is compress the time between "I know what I need to build" and "it's built," freeing cognitive bandwidth for harder problems.

## The Junior Developer Effect

One of the most debated outcomes is how AI assistants affect less experienced developers. Early fears that they would short-circuit learning appear overblown — juniors still struggle with the same conceptual gaps. What's changed is the *surface area* of what they can attempt.

A junior developer today can spin up a working API with authentication, write a suite of unit tests, and deploy to a cloud provider in a single afternoon — tasks that once required weeks of accumulated knowledge. The best outcomes come when AI-generated code is treated as a first draft to be understood, not a final answer to be shipped.

## The New Skill: Prompt Engineering for Code

A quieter shift is happening in what it means to be a skilled developer. The ability to describe a problem precisely, break it into tractable pieces, and evaluate generated output critically is becoming as valuable as the ability to write the code itself.

Senior developers who have adapted best tend to treat AI like a fast but inexperienced pair programmer: great at suggesting approaches, poor at knowing which approach fits *this* codebase, *this* team, *this* constraint. The skill is in the steering.

## What Hasn't Changed

Despite the transformation, the fundamentals remain stubbornly relevant. Understanding data structures, reading error messages, knowing when *not* to add complexity — these haven't been automated away. As AI lowers the cost of writing code, the ability to reason about what code *should* do becomes more valuable, not less.

The developers thriving in this environment aren't the ones who've handed the wheel to AI. They're the ones who've figured out exactly how much of the wheel to hand over.`

// ── Helpers ──────────────────────────────────────────────────────────────────

function tokenize(text: string, delay: number): DemoStep[] {
  return (text.match(/\S+\s*/g) ?? []).map(token => ({
    delay,
    data: { stage: 'writer_token', token }
  }))
}

// ── Event sequence ───────────────────────────────────────────────────────────

export function getDemoSteps(): DemoStep[] {
  const sources = [
    {
      url: 'https://github.blog/2022-09-07-research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/',
      title:
        "Research: quantifying GitHub Copilot's impact on developer productivity – The GitHub Blog"
    },
    {
      url: 'https://survey.stackoverflow.co/2024/ai',
      title: 'Stack Overflow Developer Survey 2024: AI Tools'
    },
    {
      url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-AI',
      title: 'The economic potential of generative AI | McKinsey & Company'
    },
    {
      url: 'https://www.infoq.com/articles/ai-pair-programming-impact/',
      title: 'The Impact of AI Pair Programming on Software Development – InfoQ'
    }
  ]

  const seoMeta = {
    titles: [
      'How AI Coding Assistants Are Reshaping Software Development in 2024',
      'AI Tools and Developer Productivity: What the Data Actually Shows',
      'The Real Impact of GitHub Copilot and AI Assistants on Dev Teams'
    ],
    metaDescription:
      'Two years after widespread AI coding assistant adoption, we examine the real impacts on speed, junior developers, and what skills still matter most in software development.',
    tags: [
      'AI',
      'software development',
      'developer productivity',
      'GitHub Copilot',
      'generative AI'
    ],
    slug: 'ai-coding-assistants-reshaping-software-development'
  }

  return [
    { delay: 0, data: { stage: 'started', runId: 'demo-run-001' } },
    {
      delay: 700,
      data: { stage: 'query_generator', label: 'Generated 4 search queries' }
    },
    {
      delay: 1100,
      data: { stage: 'source_fetcher', label: 'Fetched 4 sources' }
    },
    {
      delay: 1200,
      data: {
        stage: 'source_scorer',
        label: 'Scored and ranked 4 sources',
        sources
      }
    },
    {
      delay: 1400,
      data: { stage: 'outliner', label: 'Outline ready', outline: OUTLINE }
    },
    { delay: 500, data: { stage: 'writer', label: 'Writing first draft…' } },
    ...tokenize(FIRST_DRAFT, 22),
    {
      delay: 900,
      data: {
        stage: 'fact_checker',
        label: 'Fact-check complete — 1 revision needed',
        approved: false,
        revisionCount: 0,
        notes: [
          'Claim: "Studies show…55% faster" — add specific attribution to the GitHub Copilot productivity study rather than using vague "Studies show"'
        ]
      }
    },
    {
      delay: 550,
      data: {
        stage: 'writer',
        label: 'Revising draft…',
        revisionCount: 1,
        changes: [
          'Added specific source attribution for the 55% productivity figure (GitHub-commissioned study)'
        ]
      }
    },
    ...tokenize(REVISED_DRAFT, 18),
    {
      delay: 700,
      data: {
        stage: 'fact_checker',
        label: 'Fact-check passed',
        approved: true,
        revisionCount: 1
      }
    },
    {
      delay: 900,
      data: {
        stage: 'editor',
        label: 'Editing complete',
        notes: [
          'Tightened the opening hook for more immediate impact',
          'Improved transitions between sections',
          'Adjusted passive constructions in closing paragraph for directness'
        ]
      }
    },
    {
      delay: 800,
      data: { stage: 'seo', label: 'SEO metadata generated', meta: seoMeta }
    },
    {
      delay: 400,
      data: {
        stage: 'done',
        runId: 'demo-run-001',
        post: REVISED_DRAFT,
        sources,
        seoMeta
      }
    }
  ]
}

// ── Demo history posts ────────────────────────────────────────────────────────

const REMOTE_WORK_POST = `# The Future of Remote Work: What Hybrid Teams Are Getting Wrong

Three years after the great remote work experiment, most companies have settled into some version of hybrid — and most of them are doing it badly.

The problem isn't remote work itself. The data on distributed teams is surprisingly positive: individual focus improves, commute stress disappears, talent pools expand beyond geography. The problem is that most organisations have bolted hybrid onto office-centric cultures without changing any of the underlying assumptions.

## The Presence Trap

The most common mistake is measuring presence instead of output. When managers can't see their teams, many default to proxies: calendar density, response times, online status indicators. This creates a performance that optimises for appearing busy rather than doing meaningful work.

Remote workers in these environments quickly learn to schedule performative meetings, send frequent status updates, and keep their green dot lit. The irony is that this behaviour actively degrades the thing remote work is supposed to improve: focused, uninterrupted deep work.

## Async-First vs Remote-First

There's an important distinction companies routinely miss. *Remote-first* means the default assumption is that people work from different places. *Async-first* means the default assumption is that people work at different times.

Most hybrid setups are neither. Meetings get moved to video calls, but they still happen at fixed times, still interrupt everyone's day, and still advantage those who happen to be in a timezone close to headquarters. The physical distance is accommodated; the temporal flexibility is not.

Truly effective distributed teams document decisions, communicate in writing, and treat synchronous time as a scarce resource to be spent deliberately — not a default mode that gets interrupted by occasional remote participants.

## What Actually Works

The companies doing hybrid well share a few traits. They've invested in written communication culture: decisions live in documents, not meeting notes. They've created explicit norms around availability and response times, rather than assuming ambient always-on presence. And critically, they've accepted that some roles and some people genuinely work better in person, without forcing that preference on everyone.

The uncomfortable truth is that hybrid done right requires more discipline, more documentation, and more intentional communication than either fully remote or fully in-office. Most companies aren't willing to pay that price, so they end up with the worst of both worlds: the friction of distributed work without the freedom that makes it worthwhile.`

const TRANSFORMER_POST = `# Understanding Transformer Architecture: A Practical Guide for Developers

If you've been meaning to understand how large language models actually work — not just use them — this is the guide. We'll skip the academic formalism and focus on the intuitions that matter for developers building on top of these systems.

## The Core Idea: Attention

Before transformers, sequence models processed text left to right, one token at a time. Each token's representation was influenced by everything before it, but that influence faded with distance. Long-range dependencies — a pronoun referring to a noun three paragraphs earlier — were hard to learn.

Transformers solve this with **self-attention**: every token looks at every other token simultaneously and decides how much to "attend" to each one when forming its own representation. Distance doesn't matter. A token at position 500 can directly influence a token at position 1 with equal weight to its immediate neighbours.

## Queries, Keys, and Values

The attention mechanism is often explained with a retrieval analogy. Each token generates a query (what do I need?), a key (what do I have?), and a value (what information should I provide?). Attention scores are computed by comparing queries against all keys, then those scores weight how much of each value gets incorporated.

In practice, the model learns to use this mechanism to track grammatical agreement, coreference, semantic relationships, and much more — entirely from training data, without any hand-engineered rules.

## Why "Multi-Head"?

A single attention head can only look for one type of relationship at a time. Multi-head attention runs several attention mechanisms in parallel, each potentially specialising: one head might track syntactic dependencies, another semantic similarity, another positional patterns.

The outputs are concatenated and projected back to the original dimension. This lets the model represent multiple relationship types simultaneously, which turns out to be important for the complex interdependencies in natural language.

## What This Means for Developers

Understanding attention has practical implications for how you use these models:

1. **Context length matters**: Everything in the context window attends to everything else. Longer contexts mean quadratically more computation — which is why there's been so much engineering work on efficient attention variants.

2. **Position in the prompt matters**: Attention weights aren't uniform. Instructions at the beginning and end of a prompt tend to receive more attention than content buried in the middle — a known limitation called "lost in the middle."

3. **Tokenisation is real**: Models don't see words, they see tokens — subword units from a learned vocabulary. This affects everything from how the model handles rare words to how it counts characters.

The transformer architecture is elegantly simple at its core — attention plus feed-forward layers, repeated — which is part of why it's scaled so well. Once you have the intuition, a lot of LLM behaviour that seems mysterious starts to make sense.`

export type DemoPostListItem = {
  id: string
  savedAt: string
  topic: string
  seoTitle: string
  format: string
  wordCount: string
}

export type DemoSavedPost = DemoPostListItem & {
  tone: string
  post: string
  sources: Array<{ url: string; title: string }>
  seoMeta: {
    titles: string[]
    metaDescription: string
    tags: string[]
    slug: string
  }
}

export const DEMO_HISTORY_ITEMS: DemoPostListItem[] = [
  {
    id: 'demo-history-001',
    savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    topic: 'The future of remote work and hybrid teams',
    seoTitle: 'The Future of Remote Work: What Hybrid Teams Are Getting Wrong',
    format: 'blog post',
    wordCount: 'medium (~600 words)'
  },
  {
    id: 'demo-history-002',
    savedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    topic: 'How transformer architecture works for developers',
    seoTitle: 'Understanding Transformer Architecture: A Practical Guide for Developers',
    format: 'tutorial',
    wordCount: 'medium (~600 words)'
  }
]

export const DEMO_SAVED_POSTS: Record<string, DemoSavedPost> = {
  'demo-history-001': {
    ...DEMO_HISTORY_ITEMS[0],
    tone: 'formal and informative',
    post: REMOTE_WORK_POST,
    sources: [
      {
        url: 'https://www.microsoft.com/en-us/worklab/work-trend-index',
        title: 'Microsoft Work Trend Index 2023: Will AI Fix Work?'
      },
      {
        url: 'https://buffer.com/state-of-remote-work',
        title: "Buffer's State of Remote Work 2024"
      },
      {
        url: 'https://hbr.org/2023/08/the-problem-with-hybrid-work',
        title: 'The Problem with Hybrid Work – Harvard Business Review'
      }
    ],
    seoMeta: {
      titles: [
        'The Future of Remote Work: What Hybrid Teams Are Getting Wrong',
        'Why Most Hybrid Work Policies Are Failing — And How to Fix Them',
        'Async-First vs Remote-First: The Hybrid Work Distinction That Matters'
      ],
      metaDescription:
        'Most companies adopted hybrid work without changing their office-centric assumptions. Here\'s what "presence trap" thinking costs teams, and what distributed-first companies do differently.',
      tags: ['remote work', 'hybrid teams', 'async work', 'distributed teams', 'workplace culture'],
      slug: 'future-remote-work-hybrid-teams-getting-wrong'
    }
  },
  'demo-history-002': {
    ...DEMO_HISTORY_ITEMS[1],
    tone: 'formal and informative',
    post: TRANSFORMER_POST,
    sources: [
      {
        url: 'https://arxiv.org/abs/1706.03762',
        title: 'Attention Is All You Need (Vaswani et al., 2017)'
      },
      {
        url: 'https://jalammar.github.io/illustrated-transformer/',
        title: 'The Illustrated Transformer – Jay Alammar'
      },
      {
        url: 'https://arxiv.org/abs/2307.03172',
        title: 'Lost in the Middle: How Language Models Use Long Contexts'
      }
    ],
    seoMeta: {
      titles: [
        'Understanding Transformer Architecture: A Practical Guide for Developers',
        'How Self-Attention Works: Transformers Explained Without the Math',
        'LLM Internals Every Developer Should Know: Transformers, Tokens, and Attention'
      ],
      metaDescription:
        'A developer-focused explanation of transformer architecture: how self-attention, queries/keys/values, and multi-head attention work — and what it means for building with LLMs.',
      tags: ['transformers', 'LLMs', 'machine learning', 'AI', 'deep learning', 'NLP'],
      slug: 'understanding-transformer-architecture-practical-guide-developers'
    }
  }
}
