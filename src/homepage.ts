export function renderHomepageHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pi Sandbox Kubernetes Runtime</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    :root {
      --ink: #0f1714;
      --muted: #4a5e58;
      --line: #d4dbd7;
      --paper: #f4f6f3;
      --panel: #ffffff;
      --teal: #0d7a70;
      --teal-light: #14a396;
      --mint: #c8f0e0;
      --mint-soft: #e8f8f0;
      --glow: rgba(13, 122, 112, 0.12);
    }

    [data-theme="dark"] {
      --ink: #e8efed;
      --muted: #8fa39f;
      --line: #1e2e2a;
      --paper: #0a100e;
      --panel: #111a17;
      --teal: #2dd4bf;
      --teal-light: #5eead4;
      --mint: #0d2e28;
      --mint-soft: #0a201c;
      --glow: rgba(45, 212, 191, 0.12);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      background: var(--paper);
      color: var(--ink);
      font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
      transition: background 0.25s, color 0.25s;
    }

    /* NAV */
    nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      height: 64px;
      background: rgba(244, 246, 243, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
      transition: background 0.25s, border-color 0.25s;
    }

    [data-theme="dark"] nav {
      background: rgba(10, 16, 14, 0.88);
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 15px;
      color: var(--ink);
      text-decoration: none;
    }

    .nav-logo-icon {
      width: 32px;
      height: 32px;
      background: var(--teal);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 16px;
    }

    .nav-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 18px;
      background: var(--ink);
      color: var(--paper);
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.15s;
    }

    .nav-link:hover { opacity: 0.85; }

    .theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      color: var(--ink);
      font-size: 17px;
      cursor: pointer;
      font-weight: 400;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
      flex-shrink: 0;
    }

    .theme-btn:hover {
      background: var(--mint-soft);
      border-color: var(--teal);
      transform: scale(1.08);
    }

    /* HERO */
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 100px 24px 80px;
      position: relative;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(13, 122, 112, 0.13), transparent),
        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(200, 240, 224, 0.4), transparent);
      pointer-events: none;
      transition: background 0.25s;
    }

    [data-theme="dark"] .hero::before {
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45, 212, 191, 0.08), transparent),
        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(13, 46, 40, 0.6), transparent);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: var(--mint-soft);
      border: 1px solid var(--mint);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: var(--teal);
      margin-bottom: 28px;
    }

    .hero-badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--teal);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    h1 {
      font-size: clamp(40px, 6vw, 76px);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.03em;
      max-width: 900px;
      margin-bottom: 24px;
    }

    h1 span {
      background: linear-gradient(135deg, var(--teal) 0%, var(--teal-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-sub {
      font-size: clamp(16px, 2vw, 20px);
      color: var(--muted);
      max-width: 600px;
      margin-bottom: 44px;
      font-weight: 400;
      line-height: 1.65;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 72px;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 50px;
      padding: 0 28px;
      background: var(--teal);
      color: #fff;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s, transform 0.1s;
    }

    .btn-primary:hover { background: var(--teal-light); transform: translateY(-1px); }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 50px;
      padding: 0 28px;
      background: var(--panel);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: border-color 0.15s, transform 0.1s;
    }

    .btn-secondary:hover { border-color: var(--teal); transform: translateY(-1px); }

    /* TERMINAL PREVIEW */
    .terminal {
      width: min(720px, 100%);
      background: #0f1714;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06);
      text-align: left;
    }

    .terminal-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 18px;
      background: #1a2420;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .terminal-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .terminal-body {
      padding: 20px 22px;
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 13px;
      line-height: 1.8;
      color: #a8c4bc;
    }

    .t-dim { color: #4a6b62; }
    .t-green { color: #4ade80; }
    .t-teal { color: #2dd4bf; }
    .t-amber { color: #fbbf24; }
    .t-white { color: #e2ede9; }

    /* FEATURES */
    .section {
      padding: 100px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-label {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--teal);
      margin-bottom: 14px;
    }

    .section-title {
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin-bottom: 16px;
    }

    .section-sub {
      font-size: 17px;
      color: var(--muted);
      max-width: 520px;
      line-height: 1.65;
      margin-bottom: 56px;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .feature {
      padding: 28px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .feature:hover {
      border-color: rgba(13, 122, 112, 0.35);
      box-shadow: 0 8px 32px var(--glow);
    }

    .feature-icon {
      width: 44px;
      height: 44px;
      background: var(--mint-soft);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-bottom: 16px;
    }

    .feature h3 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .feature p {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.6;
    }

    /* HOW IT WORKS */
    .how {
      background: var(--panel);
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
    }

    .step {
      padding: 36px 28px;
      border-right: 1px solid var(--line);
      position: relative;
    }

    .step:last-child { border-right: 0; }

    .step-num {
      width: 36px;
      height: 36px;
      background: var(--mint-soft);
      border: 1px solid var(--mint);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      color: var(--teal);
      margin-bottom: 16px;
    }

    .step h3 {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .step p {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.6;
    }

    /* STATS */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 0;
    }

    .stat {
      padding: 32px 24px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      text-align: center;
    }

    .stat-num {
      font-size: 42px;
      font-weight: 800;
      color: var(--teal);
      line-height: 1;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .stat-label {
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }

    /* CTA */
    .cta {
      text-align: center;
      padding: 100px 24px;
      background: linear-gradient(180deg, var(--paper), var(--mint-soft));
      border-top: 1px solid var(--line);
      transition: background 0.25s;
    }

    .cta h2 {
      font-size: clamp(28px, 4vw, 48px);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
    }

    .cta p {
      font-size: 17px;
      color: var(--muted);
      margin-bottom: 36px;
    }

    /* FOOTER */
    footer {
      padding: 28px 40px;
      border-top: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      color: var(--muted);
    }

    @media (max-width: 900px) {
      nav { padding: 0 20px; }
      .features { grid-template-columns: 1fr 1fr; }
      .steps { grid-template-columns: 1fr 1fr; }
      .step { border-bottom: 1px solid var(--line); }
      .stats { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 600px) {
      .features, .steps, .stats { grid-template-columns: 1fr; }
      .step { border-right: 0; }
      footer { flex-direction: column; gap: 8px; text-align: center; }
    }
  </style>
</head>
<body>

  <nav>
    <a class="nav-logo" href="/">
      <div class="nav-logo-icon">⬡</div>
      Pi Sandbox
    </a>
    <div style="display:flex;align-items:center;gap:10px">
      <button class="theme-btn" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">🌙</button>
      <a class="nav-link" href="/dashboard">Open Runtime →</a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="hero-badge">
      <span class="hero-badge-dot"></span>
      Kubernetes-native · LLM-powered · Live dashboard
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
      <a class="btn-primary" href="/dashboard">Open Live Dashboard →</a>
      <a class="btn-secondary" href="#how-it-works">See how it works</a>
    </div>

    <div class="terminal">
      <div class="terminal-bar">
        <div class="terminal-dot" style="background:#ff5f57"></div>
        <div class="terminal-dot" style="background:#febc2e"></div>
        <div class="terminal-dot" style="background:#28c840"></div>
        <span style="margin-left:8px;font-size:12px;color:#4a6b62;font-family:monospace">pi-sandbox-runtime</span>
      </div>
      <div class="terminal-body">
        <div><span class="t-dim">$</span> <span class="t-white">curl -X POST localhost:3000/chat \</span></div>
        <div><span class="t-white">&nbsp;&nbsp;-d '{"message":"Run pwd and ls in the sandbox"}'</span></div>
        <br>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-amber">Waiting for a free pod...</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-green">Acquired pod: sandbox-runner-3</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-teal">Command: pwd && ls /workspace</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-green">Exit code: 0 · Duration: 214ms</span></div>
        <div><span class="t-dim">[Sandbox]</span> <span class="t-amber">Released pod: sandbox-runner-3</span></div>
        <br>
        <div><span class="t-dim">→</span> <span class="t-white">/workspace</span></div>
        <div><span class="t-dim">→</span> <span class="t-teal">app.js &nbsp;package.json &nbsp;node_modules/</span></div>
      </div>
    </div>
  </section>

  <!-- STATS -->
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

  <!-- FEATURES -->
  <div class="section">
    <span class="section-label">Capabilities</span>
    <h2 class="section-title">Built for safe AI execution</h2>
    <p class="section-sub">Every design decision prioritises isolation, correctness, and observability.</p>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">🔒</div>
        <h3>Kubernetes sandbox execution</h3>
        <p>Commands run inside isolated pods via <code>kubectl exec</code>. No shared state, no host access, no escape.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">♨️</div>
        <h3>Warm pod pool</h3>
        <p>8 pods stay alive and ready. No cold-start penalty — a lease is acquired in milliseconds.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🗑️</div>
        <h3>Disposable environments</h3>
        <p>Each tool call gets a fresh execution context. The workspace is an ephemeral <code>emptyDir</code> — gone on release.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">📁</div>
        <h3>Filesystem isolation</h3>
        <p>No hostPath mounts, read-only root, dropped capabilities, and <code>seccompProfile: RuntimeDefault</code>.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🧠</div>
        <h3>Session-aware runtime</h3>
        <p>Every request gets its own agent instance. Conversation history never leaks between users or sessions.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🛡️</div>
        <h3>Lease-based locking</h3>
        <p>Kubernetes <code>coordination.k8s.io/v1</code> Leases with optimistic concurrency prevent any double-booking.</p>
      </div>
    </div>
  </div>

  <!-- HOW IT WORKS -->
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
          <h3>Execute &amp; release</h3>
          <p>The command runs inside the pod via <code>kubectl exec</code>. stdout, stderr, and exit code are captured. The lease is always released in <code>finally</code>.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta">
    <h2>See it live</h2>
    <p>Open the runtime dashboard to watch pods lease, queue, and release in real time.</p>
    <a class="btn-primary" href="/dashboard" style="font-size:16px;height:54px;padding:0 36px">
      Open Live Dashboard →
    </a>
  </div>

  <footer>
    <span>Pi Sandbox Kubernetes Runtime</span>
    <span>LLM-powered · Kubernetes · Hono</span>
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
