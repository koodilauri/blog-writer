<script lang="ts">
  type Props = {
    userEmail: string
    isDemo: boolean
    historyCollapsed: boolean
    ontogglemobile: () => void
    ontogglesidebar: () => void
    onlogout: () => void
  }
  let { userEmail, isDemo, historyCollapsed, ontogglemobile, ontogglesidebar, onlogout }: Props =
    $props()
</script>

<header>
  <div class="hd-left">
    <button
      class="sidebar-toggle mobile-toggle"
      onclick={ontogglemobile}
      aria-label="Toggle history"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
    <button
      class="sidebar-toggle desktop-toggle"
      onclick={ontogglesidebar}
      aria-label={historyCollapsed ? 'Expand history' : 'Collapse history'}
      title={historyCollapsed ? 'Show history' : 'Hide history'}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <a href="/generate{isDemo ? '?demo' : ''}" class="logo" aria-label="BlogWriter home">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="url(#lgGrad)"
            fill-opacity="0.15"
          />
          <path
            d="M17.5 6.5a1.5 1.5 0 00-2.12 0l-7.5 7.5a2.5 2.5 0 00-.63 1.07L6.5 17.5l2.43-.75a2.5 2.5 0 001.07-.63l7.5-7.5a1.5 1.5 0 000-2.12z"
            stroke="url(#lgGrad)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M15.5 8.5l2 2" stroke="url(#lgGrad)" stroke-width="1.5" stroke-linecap="round" />
          <defs>
            <linearGradient
              id="lgGrad"
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#a5b4fc" />
              <stop offset="1" stop-color="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="logo-text">
        <span class="logo-name">BlogWriter</span>
        <span class="logo-tag">AI-powered</span>
      </div>
    </a>
  </div>

  <div class="hd-right">
    <a href="/generate{isDemo ? '?demo' : ''}" class="new-post-btn" title="Start a new post">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
        />
      </svg>
      New Post
    </a>
    {#if userEmail}
      <span class="user-email">{userEmail}</span>
    {/if}
    <button class="logout-btn" onclick={onlogout}>Sign out</button>
  </div>
</header>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.25rem;
    height: 52px;
    background: rgba(8, 12, 20, 0.88);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 0.5rem;
  }
  .hd-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
  }
  .hd-right {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;
  }
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: #94a3b8;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
    flex-shrink: 0;
    padding: 0;
  }
  .sidebar-toggle:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #f1f5f9;
  }
  .mobile-toggle {
    display: none;
  }
  .desktop-toggle {
    display: flex;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    text-decoration: none;
    flex-shrink: 0;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(129, 140, 248, 0.1) 100%);
    border: 1px solid rgba(129, 140, 248, 0.25);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .logo-name {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }
  .logo-tag {
    font-size: 0.6rem;
    color: #475569;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 500;
    line-height: 1;
  }
  .new-post-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.7rem;
    background: #6366f1;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s,
      transform 0.1s;
    white-space: nowrap;
  }
  .new-post-btn:hover {
    background: #818cf8;
    transform: translateY(-1px);
  }
  .user-email {
    font-size: 0.78rem;
    color: #475569;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .logout-btn {
    padding: 0.3rem 0.65rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 6px;
    color: #475569;
    font-size: 0.76rem;
    font-family: inherit;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
    white-space: nowrap;
  }
  .logout-btn:hover {
    border-color: rgba(255, 255, 255, 0.18);
    color: #94a3b8;
  }
  @media (max-width: 640px) {
    .mobile-toggle {
      display: flex;
    }
    .desktop-toggle {
      display: none;
    }
  }
</style>
