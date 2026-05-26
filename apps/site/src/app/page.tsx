const embedSnippet = `<script
  src="https://your-triage.example.com/embed.js"
  data-widget-key="local-dev-widget"
  async
></script>`;

export default function MarketingPage() {
  return (
    <main className="page">
      <nav className="shell nav">
        <a className="brand" href="#">
          <span className="brand-mark" aria-hidden />
          Triage
        </a>
        <div className="navlinks">
          <a href="#product">Product</a>
          <a href="#routing">Routing</a>
          <a href="#deploy">Deploy</a>
        </div>
        <a className="nav-cta" href="#deploy">
          Self-host
        </a>
      </nav>

      <section className="shell hero">
        <div className="hero-copy">
          <div className="eyebrow">Open-source feedback operations</div>
          <h1>Turn product feedback into routed work.</h1>
          <p className="lead">
            Triage gives self-hosting teams an embeddable widget, AI-assisted
            classification, metadata escalation, internal handling, and Linear
            or Jira handoff.
          </p>
          <div className="actions">
            <a className="button primary" href="#deploy">
              Deploy it yourself
            </a>
            <a className="button" href="#product">
              View workflow
            </a>
          </div>
        </div>

        <div className="product-frame" aria-label="Product preview">
          <div className="frame-top">
            <span />
            <span />
            <span />
          </div>
          <div className="product-grid">
            <aside>
              <strong>Queue</strong>
              <span>Widgets</span>
              <span>KB</span>
              <span>Settings</span>
            </aside>
            <section>
              <div className="preview-head">
                <div>
                  <p>Tickets</p>
                  <strong>143</strong>
                </div>
                <span className="pill critical">Critical</span>
              </div>
              <Ticket
                meta="enterprise account"
                tier="critical"
                title="Checkout fails after plan upgrade"
                pill="Linear issue drafted"
              />
              <Ticket
                meta="production"
                tier="expedite"
                title="Reports take 18 seconds to load"
                pill="performance"
              />
              <Ticket
                meta="docs gap"
                tier="watch"
                title="Webhook retry behavior is unclear"
                pill="knowledge gap"
              />
            </section>
            <div className="widget-preview">
              <div className="widget-card">
                <span>Feedback</span>
                <strong>What happened?</strong>
                <div />
                <button>Send feedback</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell strip" id="product">
        <div>
          <span className="eyebrow">How it works</span>
          <h2>One path from website signal to engineering work.</h2>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <strong>Collect</strong>
            <p>Install the widget on a marketing site, app screen, or inline support page.</p>
          </li>
          <li>
            <span>02</span>
            <strong>Classify</strong>
            <p>AI triage uses company context, form data, and metadata to draft a clean issue.</p>
          </li>
          <li>
            <span>03</span>
            <strong>Route</strong>
            <p>Escalation rules mark important feedback and can create Linear or Jira work.</p>
          </li>
        </ol>
      </section>

      <section className="shell feature-grid" id="routing">
        <article className="feature wide">
          <h2>Metadata escalation</h2>
          <p>
            Route high-value accounts, production incidents, or affected-user
            thresholds with explicit rules your team can inspect and edit.
          </p>
          <div className="rule-list">
            <span>plan = enterprise</span>
            <span>environment = production</span>
            <span>affectedUsers &gt;= 25</span>
          </div>
        </article>
        <article className="feature">
          <h2>Brandable widget</h2>
          <p>
            Configure palettes, copy, fields, attachments, submission types,
            and launcher placement per widget.
          </p>
        </article>
        <article className="feature">
          <h2>Internal queue</h2>
          <p>
            Keep support handling inside Triage when an external engineering
            issue is not needed.
          </p>
        </article>
        <article className="feature">
          <h2>KB deflection</h2>
          <p>Suggest support articles before a ticket is created.</p>
        </article>
        <article className="feature">
          <h2>Own the stack</h2>
          <p>Run it with Postgres, Redis, object storage, and your own provider keys.</p>
        </article>
      </section>

      <section className="shell deploy" id="deploy">
        <div>
          <span className="eyebrow">Deploy</span>
          <h2>Install the widget with one script tag.</h2>
          <p>
            Host the dashboard and backend yourself, then add the embed snippet
            anywhere customers can give feedback.
          </p>
        </div>
        <pre className="code">{embedSnippet}</pre>
      </section>
    </main>
  );
}

function Ticket({
  meta,
  tier,
  title,
  pill,
}: {
  meta: string;
  tier: string;
  title: string;
  pill: string;
}) {
  return (
    <article className="ticket">
      <div className="ticket-meta">
        <span>{meta}</span>
        <span>{tier}</span>
      </div>
      <h3>{title}</h3>
      <span className="pill">{pill}</span>
    </article>
  );
}
