export function renderDashboardHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Super 30 Runtime</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #18201f;
      --muted: #65706e;
      --line: #d9dfdc;
      --paper: #f7f8f5;
      --panel: #ffffff;
      --teal: #14877c;
      --mint: #d8f3e6;
      --amber: #b97913;
      --amber-soft: #fff0cf;
      --red: #b94747;
      --red-soft: #ffe3df;
      --violet: #6954b8;
      --cyan: #daf4f5;
      --shadow: 0 16px 50px rgba(24, 32, 31, 0.1);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(216, 243, 230, 0.75), rgba(247, 248, 245, 0.42) 280px),
        var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
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
      margin: 10px 0 0;
      max-width: 760px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.5;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      color: var(--muted);
      white-space: nowrap;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--teal);
      box-shadow: 0 0 0 4px rgba(20, 135, 124, 0.15);
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
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 8px 26px rgba(24, 32, 31, 0.06);
    }

    .metric span,
    .label {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
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
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      min-height: 56px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(247, 248, 245, 0.9);
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
      min-height: 154px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      position: relative;
      overflow: hidden;
    }

    .pod.busy {
      border-color: rgba(20, 135, 124, 0.45);
      background: linear-gradient(180deg, #ffffff, var(--mint));
    }

    .pod.expired {
      border-color: rgba(185, 121, 19, 0.45);
      background: linear-gradient(180deg, #ffffff, var(--amber-soft));
    }

    .pod.free {
      background: #ffffff;
    }

    .pod-name {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
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
      border-radius: 999px;
      background: #eef1ee;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .busy .badge,
    .running {
      background: var(--mint);
      color: var(--teal);
    }

    .failed,
    .expired .badge {
      background: var(--red-soft);
      color: var(--red);
    }

    .completed,
    .released {
      background: var(--cyan);
      color: #176c72;
    }

    .waiting,
    .started {
      background: var(--amber-soft);
      color: var(--amber);
    }

    .meta {
      margin-top: 12px;
      display: grid;
      gap: 8px;
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
      background: rgba(247, 248, 245, 0.72);
    }

    .lane h3 {
      margin: 0 0 10px;
      font-size: 13px;
    }

    .item {
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      margin-top: 8px;
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
      color: var(--ink);
      background: #fff;
      outline: none;
    }

    textarea:focus {
      border-color: var(--teal);
      box-shadow: 0 0 0 4px rgba(20, 135, 124, 0.14);
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    button {
      min-height: 40px;
      padding: 0 16px;
      border: 0;
      border-radius: 8px;
      background: var(--ink);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
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
      background: #fbfcfa;
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
      font-size: 13px;
      border-bottom: 1px solid rgba(217, 223, 220, 0.65);
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
        <h1>Super 30 Runtime</h1>
        <p class="subtitle">Live view of chat requests, Pi tool calls, Kubernetes Lease queueing, sandbox pod usage, command output, and release events.</p>
      </div>
      <div class="status-pill"><span class="dot"></span><span id="poll-status">Connecting</span></div>
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
              <textarea id="message" placeholder="Ask something that may need a sandbox command...">Run a quick command in the sandbox to print the current directory and list files.</textarea>
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
        var duration = tool.durationMs ? " · " + tool.durationMs + "ms" : "";
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
        var duration = request.durationMs ? " · " + request.durationMs + "ms" : "";
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
          (parts.length ? '<div class="row-sub mono">' + escapeHtml(parts.join(" · ")) + '</div>' : "") +
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

    poll();
    setInterval(poll, 700);
  </script>
</body>
</html>`;
}
