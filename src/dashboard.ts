export function renderDashboardHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pi Sandbox Kubernetes Runtime - Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #111111;
      --muted: #5c5c5c;
      --line: #dedede;
      --paper: #f7f7f5;
      --panel: #ffffff;
      --soft: #eeeeec;
      --soft-strong: #e2e2df;
      --inverse: #ffffff;
      --accent: #2563eb;
      --accent-soft: #dbeafe;
      --accent-strong: #1d4ed8;
      --success: #0f8a5f;
      --success-soft: #dff7ea;
      --warning: #b7791f;
      --warning-soft: #fff3d6;
      --danger: #b42318;
      --danger-soft: #fee4e2;
      --violet: #6d5bd0;
      --violet-soft: #ece9ff;
      --button-bg: var(--accent);
      --button-text: #ffffff;
      --button-hover: var(--accent-strong);
      --shadow: 0 18px 54px rgba(37, 99, 235, 0.11);
    }

    [data-theme="dark"] {
      color-scheme: dark;
      --ink: #f4f4f4;
      --muted: #aaaaaa;
      --line: #303030;
      --paper: #070707;
      --panel: #111111;
      --soft: #1b1b1b;
      --soft-strong: #282828;
      --inverse: #070707;
      --accent: #60a5fa;
      --accent-soft: #10243f;
      --accent-strong: #93c5fd;
      --success: #34d399;
      --success-soft: #0f2f24;
      --warning: #fbbf24;
      --warning-soft: #35270a;
      --danger: #fb7185;
      --danger-soft: #3a1119;
      --violet: #a78bfa;
      --violet-soft: #251b3f;
      --button-bg: var(--accent);
      --button-text: #07111f;
      --button-hover: var(--accent-strong);
      --shadow: 0 18px 54px rgba(96, 165, 250, 0.14);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(37, 99, 235, 0.12), transparent 290px),
        radial-gradient(circle at 85% 0%, rgba(109, 91, 208, 0.12), transparent 360px),
        var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
      transition: background 0.25s, color 0.25s;
    }

    [data-theme="dark"] body {
      background:
        linear-gradient(180deg, rgba(96, 165, 250, 0.15), transparent 290px),
        radial-gradient(circle at 85% 0%, rgba(167, 139, 250, 0.16), transparent 360px),
        var(--paper);
    }

    button,
    textarea {
      font: inherit;
    }

    .shell {
      width: min(1500px, calc(100% - 32px));
      margin: 0 auto;
      padding: 22px 0 28px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 20px;
      align-items: end;
      padding: 14px 0 20px;
    }

    h1 {
      margin: 0;
      font-size: clamp(30px, 4vw, 56px);
      line-height: 0.95;
      letter-spacing: 0;
    }

    .subtitle {
      max-width: 760px;
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.5;
    }

    .top-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-shrink: 0;
    }

    .status-pill,
    .theme-btn {
      display: inline-flex;
      align-items: center;
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.82);
      color: var(--muted);
      white-space: nowrap;
    }

    [data-theme="dark"] .status-pill,
    [data-theme="dark"] .theme-btn {
      background: rgba(17, 17, 17, 0.86);
    }

    .status-pill {
      gap: 8px;
      padding: 0 12px;
    }

    .theme-btn {
      justify-content: center;
      width: 38px;
      padding: 0;
      color: var(--ink);
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }

    .theme-btn:hover {
      border-color: var(--accent);
      background: var(--accent-soft);
      transform: translateY(-1px);
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: var(--success);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 18%, transparent);
    }

    [data-theme="dark"] .dot {
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 20%, transparent);
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .metric {
      min-height: 94px;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.86);
      box-shadow: 0 8px 26px rgba(0, 0, 0, 0.055);
      transition: background 0.25s;
      position: relative;
      overflow: hidden;
    }

    .metric::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--accent);
    }

    .metric:nth-child(2)::before { background: var(--violet); }
    .metric:nth-child(3)::before { background: var(--warning); }
    .metric:nth-child(4)::before { background: var(--success); }

    [data-theme="dark"] .metric {
      background: rgba(17, 17, 17, 0.9);
    }

    .metric span,
    .label {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .metric strong {
      display: block;
      margin-top: 10px;
      font-size: 34px;
      line-height: 1;
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(340px, 0.94fr) minmax(0, 1.4fr);
      gap: 12px;
      align-items: start;
    }

    .panel {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: var(--shadow);
      transition: background 0.25s, border-color 0.25s;
    }

    [data-theme="dark"] .panel {
      background: rgba(17, 17, 17, 0.94);
    }

    .panel-header {
      display: flex;
      min-height: 56px;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(247, 247, 245, 0.94);
      transition: background 0.25s;
    }

    [data-theme="dark"] .panel-header {
      background: rgba(13, 13, 13, 0.98);
    }

    .panel-header h2 {
      margin: 0;
      font-size: 16px;
      line-height: 1.2;
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .pod-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(156px, 1fr));
      gap: 10px;
      padding: 14px;
    }

    .pod {
      position: relative;
      min-height: 154px;
      overflow: hidden;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .pod.busy {
      border-color: color-mix(in srgb, var(--accent) 58%, var(--line));
      background: linear-gradient(180deg, var(--panel), var(--accent-soft));
    }

    .pod.expired {
      border-color: color-mix(in srgb, var(--warning) 58%, var(--line));
      background: repeating-linear-gradient(135deg, var(--panel) 0 10px, var(--warning-soft) 10px 20px);
    }

    .pod-name {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 800;
      word-break: break-word;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 58px;
      min-height: 24px;
      padding: 3px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--soft);
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .busy .badge,
    .running,
    .started {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-strong);
    }

    .failed,
    .expired .badge {
      border-color: var(--danger);
      background: var(--danger-soft);
      color: var(--danger);
    }

    .completed,
    .released {
      border-color: var(--success);
      background: var(--success-soft);
      color: var(--success);
    }

    .waiting {
      border-color: var(--warning);
      background: var(--warning-soft);
      color: var(--warning);
    }

    .meta {
      display: grid;
      gap: 8px;
      margin-top: 12px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }

    .mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      word-break: break-word;
    }

    .queue {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 14px;
    }

    .lane {
      min-height: 124px;
      padding: 12px;
      border: 1px dashed var(--line);
      border-radius: 8px;
      background: rgba(247, 247, 245, 0.74);
      transition: background 0.25s;
    }

    [data-theme="dark"] .lane {
      background: rgba(13, 13, 13, 0.68);
    }

    .lane h3 {
      margin: 0 0 10px;
      font-size: 13px;
    }

    .item {
      margin-top: 8px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      gap: 12px;
    }

    .chat {
      display: grid;
      gap: 12px;
      padding: 14px;
    }

    textarea {
      width: 100%;
      min-height: 124px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 13px;
      background: var(--panel);
      color: var(--ink);
      outline: none;
      transition: background 0.25s, border-color 0.2s, box-shadow 0.2s;
    }

    textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
    }

    [data-theme="dark"] textarea:focus {
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent);
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    button {
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid var(--button-bg);
      border-radius: 8px;
      background: var(--button-bg);
      color: var(--button-text);
      cursor: pointer;
      font-weight: 800;
    }

    button:hover:not(:disabled) {
      border-color: var(--button-hover);
      background: var(--button-hover);
      color: var(--button-text);
    }

    button:disabled {
      cursor: wait;
      opacity: 0.58;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    .answer {
      min-height: 118px;
      max-height: 260px;
      overflow: auto;
      padding: 14px;
      border-top: 1px solid var(--line);
      background: var(--paper);
    }

    .list {
      max-height: 446px;
      overflow: auto;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      padding: 13px 16px;
      border-bottom: 1px solid var(--line);
    }

    .row:last-child {
      border-bottom: 0;
    }

    .row-title {
      font-weight: 800;
      word-break: break-word;
    }

    .row-sub {
      margin-top: 5px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
      word-break: break-word;
    }

    .events {
      max-height: 470px;
      overflow: auto;
      padding: 8px 0;
    }

    .event {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 10px;
      padding: 9px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 13px;
    }

    [data-theme="dark"] .event {
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }

    .event-time {
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    .empty {
      padding: 18px;
      color: var(--muted);
      font-size: 14px;
    }

    @media (max-width: 1100px) {
      .grid,
      .workspace {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 760px) {
      .shell {
        width: min(100% - 20px, 1500px);
        padding-top: 10px;
      }

      header,
      .metrics,
      .queue {
        grid-template-columns: 1fr;
      }

      header {
        align-items: start;
      }

      .status-pill {
        justify-self: start;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div>
        <h1>Pi Sandbox Runtime</h1>
        <p class="subtitle">LLM-powered agent with Kubernetes-leased sandbox execution. Live view of chat requests, tool calls, Lease queueing, pod usage, and release events.</p>
      </div>
      <div class="top-actions">
        <button class="theme-btn" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">🌙</button>
        <div class="status-pill"><span class="dot"></span><span id="poll-status">Connecting</span></div>
      </div>
    </header>

    <section class="metrics">
      <div class="metric"><span>Total pods</span><strong id="metric-pods">0</strong></div>
      <div class="metric"><span>Busy pods</span><strong id="metric-busy">0</strong></div>
      <div class="metric"><span>Waiting tools</span><strong id="metric-waiting">0</strong></div>
      <div class="metric"><span>Active requests</span><strong id="metric-active">0</strong></div>
    </section>

    <section class="grid">
      <div class="stack">
        <section class="panel">
          <div class="panel-header">
            <h2>Sandbox Pods</h2>
            <span class="label" id="pod-summary">0 online</span>
          </div>
          <div class="pod-grid" id="pods"></div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>Lease Queue</h2>
            <span class="label" id="queue-summary">Idle</span>
          </div>
          <div class="queue">
            <div class="lane">
              <h3>Waiting</h3>
              <div id="queue-waiting"></div>
            </div>
            <div class="lane">
              <h3>Acquiring</h3>
              <div id="queue-acquiring"></div>
            </div>
          </div>
        </section>
      </div>

      <div class="stack">
        <section class="workspace">
          <div class="panel">
            <div class="panel-header">
              <h2>Send Request</h2>
              <span class="label" id="request-state">Ready</span>
            </div>
            <form class="chat" id="chat-form">
              <textarea id="message" placeholder="Ask something that may need a sandbox command...">Execute the following commands parllaly using the sandbox tool. Treat each command as a separate tool invocation rather than combining them.

1. pwd && ls && sleep 5
2. pwd && ls && sleep 5
...
10. pwd && ls && sleep 5</textarea>
              <div class="actions">
                <span class="label">POST /chat</span>
                <button id="send-button" type="submit">Send</button>
              </div>
            </form>
            <div class="answer"><pre id="answer">(no response yet)</pre></div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h2>Tool Runs</h2>
              <span class="label" id="tool-summary">0 tracked</span>
            </div>
            <div class="list" id="tools"></div>
          </div>
        </section>

        <section class="workspace">
          <div class="panel">
            <div class="panel-header">
              <h2>Requests</h2>
              <span class="label" id="request-summary">0 tracked</span>
            </div>
            <div class="list" id="requests"></div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h2>Runtime Log</h2>
              <span class="label" id="event-summary">0 events</span>
            </div>
            <div class="events" id="events"></div>
          </div>
        </section>
      </div>
    </section>
  </main>

  <script>
    var lastEventId = 0;
    var renderedEvents = [];
    var isSending = false;

    var els = {
      pollStatus: document.getElementById("poll-status"),
      pods: document.getElementById("pods"),
      metricPods: document.getElementById("metric-pods"),
      metricBusy: document.getElementById("metric-busy"),
      metricWaiting: document.getElementById("metric-waiting"),
      metricActive: document.getElementById("metric-active"),
      podSummary: document.getElementById("pod-summary"),
      queueSummary: document.getElementById("queue-summary"),
      queueWaiting: document.getElementById("queue-waiting"),
      queueAcquiring: document.getElementById("queue-acquiring"),
      tools: document.getElementById("tools"),
      toolSummary: document.getElementById("tool-summary"),
      requests: document.getElementById("requests"),
      requestSummary: document.getElementById("request-summary"),
      events: document.getElementById("events"),
      eventSummary: document.getElementById("event-summary"),
      form: document.getElementById("chat-form"),
      message: document.getElementById("message"),
      answer: document.getElementById("answer"),
      requestState: document.getElementById("request-state"),
      sendButton: document.getElementById("send-button")
    };

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function time(value) {
      if (!value) return "-";
      return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    function age(value) {
      if (!value) return "";
      var ms = Math.max(0, Date.now() - Date.parse(value));
      if (ms < 1000) return "now";
      return Math.round(ms / 1000) + "s ago";
    }

    function short(value, size) {
      var text = String(value || "");
      if (text.length <= size) return text;
      return text.slice(0, size - 1) + "...";
    }

    function badge(status) {
      return '<span class="badge ' + escapeHtml(status) + '">' + escapeHtml(status) + '</span>';
    }

    function renderPods(pods) {
      els.pods.innerHTML = pods.map(function (pod) {
        var command = pod.command ? '<div><b>Command</b><div class="mono">' + escapeHtml(short(pod.command, 130)) + '</div></div>' : "";
        var holder = pod.holderIdentity ? '<div><b>Holder</b><div class="mono">' + escapeHtml(short(pod.holderIdentity, 80)) + '</div></div>' : "";
        var tool = pod.toolCallId ? '<div><b>Tool</b><div class="mono">' + escapeHtml(short(pod.toolCallId, 80)) + '</div></div>' : "";
        var renew = pod.renewTime ? '<div><b>Renewed</b> ' + escapeHtml(time(pod.renewTime)) + '</div>' : "";
        return '<article class="pod ' + escapeHtml(pod.status) + '">' +
          '<div class="pod-name"><span>' + escapeHtml(pod.podName) + '</span>' + badge(pod.status) + '</div>' +
          '<div class="meta">' + (command || holder || tool || renew ? command + holder + tool + renew : '<div>Ready for a tool call</div>') + '</div>' +
          '</article>';
      }).join("");
    }

    function renderQueue(queue) {
      function lane(items) {
        if (!items.length) return '<div class="empty">Idle</div>';
        return items.map(function (item) {
          return '<div class="item">' +
            '<div class="row-title">' + escapeHtml(item.toolName || "run_in_sandbox") + '</div>' +
            '<div class="row-sub mono">' + escapeHtml(short(item.command || item.toolCallId || "", 110)) + '</div>' +
            '<div class="row-sub">' + escapeHtml(age(item.queuedAt)) + '</div>' +
            '</div>';
        }).join("");
      }

      els.queueWaiting.innerHTML = lane(queue.waiting || []);
      els.queueAcquiring.innerHTML = lane(queue.acquiring || []);
      els.queueSummary.textContent = (queue.waiting || []).length + " waiting, " + (queue.acquiring || []).length + " acquiring";
    }

    function renderTools(tools) {
      els.toolSummary.textContent = tools.length + " tracked";
      if (!tools.length) {
        els.tools.innerHTML = '<div class="empty">No tool runs yet</div>';
        return;
      }

      els.tools.innerHTML = tools.map(function (tool) {
        var output = tool.stdout ? '<div class="row-sub mono">stdout: ' + escapeHtml(short(tool.stdout.trim(), 130)) + '</div>' : "";
        var error = tool.stderr || tool.error ? '<div class="row-sub mono">error: ' + escapeHtml(short(tool.stderr || tool.error, 130)) + '</div>' : "";
        var pod = tool.podName ? "Pod " + tool.podName : "No pod yet";
        var duration = tool.durationMs ? " / " + tool.durationMs + "ms" : "";
        return '<div class="row">' +
          '<div>' +
          '<div class="row-title">' + escapeHtml(tool.toolName) + '</div>' +
          '<div class="row-sub mono">' + escapeHtml(short(tool.command || tool.toolCallId, 160)) + '</div>' +
          '<div class="row-sub">' + escapeHtml(pod + duration) + '</div>' +
          output + error +
          '</div>' +
          '<div>' + badge(tool.status) + '</div>' +
          '</div>';
      }).join("");
    }

    function renderRequests(requests) {
      els.requestSummary.textContent = requests.length + " tracked";
      if (!requests.length) {
        els.requests.innerHTML = '<div class="empty">No requests yet</div>';
        return;
      }

      els.requests.innerHTML = requests.map(function (request) {
        var response = request.answer || request.error || "";
        var duration = request.durationMs ? " / " + request.durationMs + "ms" : "";
        return '<div class="row">' +
          '<div>' +
          '<div class="row-title mono">' + escapeHtml(request.id) + '</div>' +
          '<div class="row-sub">' + escapeHtml(short(request.message, 130)) + '</div>' +
          '<div class="row-sub">' + escapeHtml(request.toolCount + " tool calls" + duration) + '</div>' +
          (response ? '<div class="row-sub">' + escapeHtml(short(response, 150)) + '</div>' : "") +
          '</div>' +
          '<div>' + badge(request.status) + '</div>' +
          '</div>';
      }).join("");
    }

    function renderEvents(events) {
      renderedEvents = events.concat(renderedEvents).slice(0, 120);
      els.eventSummary.textContent = renderedEvents.length + " events";
      if (!renderedEvents.length) {
        els.events.innerHTML = '<div class="empty">No events yet</div>';
        return;
      }

      els.events.innerHTML = renderedEvents.map(function (event) {
        var parts = [];
        if (event.podName) parts.push("pod " + event.podName);
        if (event.toolCallId) parts.push("tool " + short(event.toolCallId, 18));
        return '<div class="event">' +
          '<div class="event-time">' + escapeHtml(time(event.at)) + '</div>' +
          '<div><b>' + escapeHtml(event.message) + '</b>' +
          (parts.length ? '<div class="row-sub mono">' + escapeHtml(parts.join(" / ")) + '</div>' : "") +
          '</div>' +
          '</div>';
      }).join("");
    }

    function renderTelemetry(payload) {
      var snapshot = payload.snapshot;
      els.metricPods.textContent = snapshot.totals.pods;
      els.metricBusy.textContent = snapshot.totals.busyPods;
      els.metricWaiting.textContent = snapshot.totals.waitingTools;
      els.metricActive.textContent = snapshot.totals.activeRequests;
      els.podSummary.textContent = snapshot.pods.length + " configured";
      renderPods(snapshot.pods);
      renderQueue(snapshot.queue);
      renderTools(snapshot.tools);
      renderRequests(snapshot.requests);
      renderEvents(payload.events || []);
      if (payload.events && payload.events.length) {
        lastEventId = Math.max.apply(null, payload.events.map(function (event) { return event.id; }));
      }
    }

    async function poll() {
      try {
        var response = await fetch("/api/telemetry?since=" + lastEventId, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        var payload = await response.json();
        renderTelemetry(payload);
        els.pollStatus.textContent = "Live " + new Date().toLocaleTimeString();
      } catch (error) {
        els.pollStatus.textContent = "Disconnected";
      }
    }

    els.form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (isSending) return;
      isSending = true;
      els.sendButton.disabled = true;
      els.requestState.textContent = "Sending";
      els.answer.textContent = "(waiting for response)";

      try {
        var response = await fetch("/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            message: els.message.value
          })
        });
        var payload = await response.json();
        els.answer.textContent = JSON.stringify(payload, null, 2);
        els.requestState.textContent = response.ok ? "Completed" : "Failed";
      } catch (error) {
        els.answer.textContent = error instanceof Error ? error.message : String(error);
        els.requestState.textContent = "Failed";
      } finally {
        isSending = false;
        els.sendButton.disabled = false;
        poll();
      }
    });

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

    fetch("/api/reset", { method: "POST" }).then(function() { poll(); });
    setInterval(poll, 150);
  </script>
</body>
</html>`;
}
