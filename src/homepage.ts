export function renderHomepageHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pi Sandbox Kubernetes Runtime</title>
  <style>
    :root {
      --ink: #111111;
      --muted: #555555;
      --line: #dedede;
      --paper: #f7f7f5;
      --panel: #ffffff;
      --soft: #eeeeec;
      --soft-strong: #e2e2df;
      --button-bg: #111111;
      --button-text: #ffffff;
      --button-hover: #333333;
      --shadow: 0 24px 70px rgba(0, 0, 0, 0.11);
    }

    [data-theme="dark"] {
      --ink: #f4f4f4;
      --muted: #aaaaaa;
      --line: #303030;
      --paper: #070707;
      --panel: #111111;
      --soft: #1b1b1b;
      --soft-strong: #282828;
      --button-bg: #ffffff;
      --button-text: #070707;
      --button-hover: #d8d8d8;
      --shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
      letter-spacing: 0;
      overflow-x: hidden;
      transition: background 0.25s, color 0.25s;
    }

    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      padding: 0 40px;
      background: rgba(247, 247, 245, 0.92);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
      transition: background 0.25s, border-color 0.25s;
    }

    [data-theme="dark"] nav {
      background: rgba(7, 7, 7, 0.92);
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--ink);
      font-size: 15px;
      font-weight: 750;
      text-decoration: none;
    }

    .nav-logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--ink);
      color: var(--paper);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-link,
    .theme-btn,
    .btn-primary,
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.12s;
    }

    .nav-link {
      height: 38px;
      padding: 0 18px;
      background: var(--button-bg);
      color: var(--button-text);
      font-size: 14px;
      font-weight: 700;
    }

    .theme-btn {
      width: 38px;
      height: 38px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
    }

    .nav-link:hover,
    .theme-btn:hover,
    .btn-primary:hover,
    .btn-secondary:hover {
      transform: translateY(-1px);
    }

    .theme-btn:hover,
    .btn-secondary:hover {
      border-color: var(--ink);
      background: var(--soft);
    }

    .hero {
      position: relative;
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 104px 24px 80px;
      overflow: hidden;
      text-align: center;
    }

    .hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.045), transparent 40%),
        repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 128px);
      pointer-events: none;
    }

    [data-theme="dark"] .hero::before {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.055), transparent 40%),
        repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 128px);
    }

    .hero > * {
      position: relative;
      z-index: 1;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 28px;
      padding: 6px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      color: var(--ink);
      font-size: 13px;
      font-weight: 700;
    }

    .hero-badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--ink);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.36; transform: scale(0.85); }
    }

    h1 {
      max-width: 930px;
      margin-bottom: 24px;
      font-size: clamp(40px, 6vw, 76px);
      font-weight: 820;
      line-height: 1.03;
      letter-spacing: 0;
    }

    h1 span {
      color: var(--ink);
      text-decoration: underline;
      text-decoration-thickness: 0.08em;
      text-underline-offset: 0.12em;
    }

    .hero-sub {
      max-width: 620px;
      margin-bottom: 42px;
      color: var(--muted);
      font-size: clamp(16px, 2vw, 20px);
      font-weight: 400;
      line-height: 1.65;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-bottom: 72px;
    }

    .btn-primary,
    .btn-secondary {
      height: 50px;
      padding: 0 28px;
      font-size: 15px;
      font-weight: 750;
    }

    .btn-primary {
      border: 1px solid var(--button-bg);
      background: var(--button-bg);
      color: var(--button-text);
    }

    .btn-primary:hover {
      background: var(--button-hover);
      border-color: var(--button-hover);
    }

    .btn-secondary {
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--ink);
    }

    .terminal {
      width: min(720px, 100%);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      background: #111111;
      box-shadow: var(--shadow);
      text-align: left;
    }

    .terminal-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: #1c1c1c;
    }

    .terminal-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
    }

    .terminal-title {
      margin-left: 8px;
      color: #9a9a9a;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    .terminal-body {
      padding: 20px 22px;
      color: #e8e8e8;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 13px;
      line-height: 1.8;
    }

    .t-dim { color: #858585; }
    .t-white,
    .t-strong { color: #f1f1f1; }

    .section {
      max-width: 1200px;
      margin: 0 auto;
      padding: 100px 24px;
    }

    .section-label {
      display: inline-block;
      margin-bottom: 14px;
      color: var(--ink);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .section-title {
      margin-bottom: 16px;
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 820;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .section-sub {
      max-width: 540px;
      margin-bottom: 56px;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.65;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .stat {
      padding: 32px 24px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      text-align: center;
    }

    .stat-num {
      margin-bottom: 8px;
      color: var(--ink);
      font-size: 42px;
      font-weight: 820;
      line-height: 1;
      letter-spacing: 0;
    }

    .stat-label {
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .feature {
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    }

    .feature:hover {
      border-color: var(--ink);
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    .feature-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin-bottom: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--soft);
      color: var(--ink);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      font-weight: 800;
    }

    .feature h3,
    .step h3 {
      margin-bottom: 8px;
      font-size: 16px;
      font-weight: 760;
    }

    .feature p,
    .step p {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .how {
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }

    .step {
      position: relative;
      padding: 36px 28px;
      border-right: 1px solid var(--line);
    }

    .step:last-child { border-right: 0; }

    .step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      margin-bottom: 16px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--soft);
      color: var(--ink);
      font-size: 13px;
      font-weight: 820;
    }

    .cta {
      padding: 100px 24px;
      border-top: 1px solid var(--line);
      background: linear-gradient(180deg, var(--paper), var(--soft));
      text-align: center;
      transition: background 0.25s;
    }

    .cta h2 {
      margin-bottom: 16px;
      font-size: clamp(28px, 4vw, 48px);
      font-weight: 820;
      letter-spacing: 0;
    }

    .cta p {
      margin-bottom: 36px;
      color: var(--muted);
      font-size: 17px;
    }

    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28px 40px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 13px;
    }

    @media (max-width: 900px) {
      nav { padding: 0 20px; }
      .features { grid-template-columns: 1fr 1fr; }
      .steps { grid-template-columns: 1fr 1fr; }
      .step { border-bottom: 1px solid var(--line); }
      .stats { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 600px) {
      .features,
      .steps,
      .stats {
        grid-template-columns: 1fr;
      }

      .step { border-right: 0; }
      footer { flex-direction: column; gap: 8px; text-align: center; }
    }
  </style>
</head>
<body>
  <nav>
    <a class="nav-logo" href="/">
      <div class="nav-logo-icon">Pi</div>
      Pi Sandbox
    </a>
    <div class="nav-actions">
      <button class="theme-btn" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">🌙</button>
      <a class="nav-link" href="/dashboard">Open Runtime</a>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-badge">
      <span class="hero-badge-dot"></span>
      Kubernetes-native / LLM-powered / Live dashboard
    </div>
    <h1>
      Secure AI tool execution<br>
      inside <span>Kubernetes sandboxes</span>
    </h1>
    <p class="hero-sub">
      Every AI tool invocation runs inside a disposable, isolated Kubernetes pod.
      Warm pool. Lease-based locking. Zero cross-contamination.
    </p>
    <div class="hero-actions">
      <a class="btn-primary" href="/dashboard">Open Live Dashboard</a>
      <a class="btn-secondary" href="#how-it-works">See how it works</a>
    </div>

    <div class="terminal">
      <div class="terminal-bar">
        <div class="terminal-dot" style="background:#f0f0f0"></div>
        <div class="terminal-dot" style="background:#9a9a9a"></div>
        <div class="terminal-dot" style="background:#565656"></div>
        <span class="terminal-title">pi-sandbox-runtime</span>
      </div>
      <div class="terminal-body">
        <div><span class="t-dim">$</span> <span class="t-white">curl -X POST localhost:3000/chat \</span></div>
        <div><span class="t-white">&nbsp;&nbsp;-d '{"message":"Run pwd and ls in the sandbox"}'</span></div>
        <br>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-strong">Waiting for a free pod...</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-strong">Acquired pod: sandbox-runner-3</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-strong">Command: pwd && ls /workspace</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-strong">Exit code: 0 / Duration: 214ms</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-strong">Released pod: sandbox-runner-3</span></div>
        <br>
        <div><span class="t-dim">&gt;</span> <span class="t-white">/workspace</span></div>
        <div><span class="t-dim">&gt;</span> <span class="t-strong">app.js &nbsp;package.json &nbsp;node_modules/</span></div>
      </div>
    </div>
  </section>

  <div style="background:var(--panel);border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
    <div style="max-width:1200px;margin:0 auto;padding:0 24px">
      <div class="stats" style="padding:40px 0">
        <div class="stat"><div class="stat-num">8</div><div class="stat-label">Warm sandbox pods</div></div>
        <div class="stat"><div class="stat-num">15s</div><div class="stat-label">Max queue wait</div></div>
        <div class="stat"><div class="stat-num">45s</div><div class="stat-label">Lease TTL</div></div>
        <div class="stat"><div class="stat-num">0</div><div class="stat-label">Cross-session leaks</div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <span class="section-label">Capabilities</span>
    <h2 class="section-title">Built for safe AI execution</h2>
    <p class="section-sub">Every design decision prioritises isolation, correctness, and observability.</p>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">01</div>
        <h3>Kubernetes sandbox execution</h3>
        <p>Commands run inside isolated pods via <code>kubectl exec</code>. No shared state, no host access, no escape.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">02</div>
        <h3>Warm pod pool</h3>
        <p>8 pods stay alive and ready. No cold-start penalty; a lease is acquired in milliseconds.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">03</div>
        <h3>Disposable environments</h3>
        <p>Each tool call gets a fresh execution context. The workspace is an ephemeral <code>emptyDir</code>, gone on release.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">04</div>
        <h3>Filesystem isolation</h3>
        <p>No hostPath mounts, read-only root, dropped capabilities, and <code>seccompProfile: RuntimeDefault</code>.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">05</div>
        <h3>Session-aware runtime</h3>
        <p>Every request gets its own agent instance. Conversation history never leaks between users or sessions.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">06</div>
        <h3>Lease-based locking</h3>
        <p>Kubernetes <code>coordination.k8s.io/v1</code> Leases with optimistic concurrency prevent any double-booking.</p>
      </div>
    </div>
  </div>

  <div class="how" id="how-it-works">
    <div style="max-width:1200px;margin:0 auto;padding:60px 24px 0">
      <span class="section-label">How it works</span>
      <h2 class="section-title">From chat message to sandbox result</h2>
      <p class="section-sub" style="margin-bottom:40px">Four steps from your prompt to a verified, isolated execution result.</p>
    </div>
    <div style="max-width:1200px;margin:0 auto">
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>POST /chat</h3>
          <p>Your message hits the Hono server. A unique <code>requestId</code> is generated and telemetry starts tracking.</p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>LLM decides</h3>
          <p>The Pi agent sends your prompt to the LLM. The model decides which commands to run and calls <code>run_in_sandbox</code>.</p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>Lease acquired</h3>
          <p>The Lease Manager finds a free pod via compare-and-swap on a Kubernetes Lease object. If all 8 are busy, it queues with a 15s timeout.</p>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <h3>Execute and release</h3>
          <p>The command runs inside the pod via <code>kubectl exec</code>. stdout, stderr, and exit code are captured. The lease is always released in <code>finally</code>.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="cta">
    <h2>See it live</h2>
    <p>Open the runtime dashboard to watch pods lease, queue, and release in real time.</p>
    <a class="btn-primary" href="/dashboard" style="font-size:16px;height:54px;padding:0 36px">
      Open Live Dashboard
    </a>
  </div>

  <footer>
    <span>Pi Sandbox Kubernetes Runtime</span>
    <span>LLM-powered / Kubernetes / Hono</span>
  </footer>

  <script>
    (function() {
      var saved = localStorage.getItem("theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var isDark = saved ? saved === "dark" : prefersDark;
      if (isDark) document.documentElement.setAttribute("data-theme", "dark");
      document.getElementById("theme-toggle").textContent = isDark ? "☀️" : "🌙";
    })();

    document.getElementById("theme-toggle").addEventListener("click", function() {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
        this.textContent = "🌙";
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        this.textContent = "☀️";
      }
    });
  </script>
</body>
</html>`;
}
