import { WidgetLoader } from './widget-loader';

const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_ORIGIN ?? 'http://localhost:3000';
const widgetKey = process.env.NEXT_PUBLIC_WIDGET_KEY ?? 'local-dev-widget';

const embedSnippet = `<script
  src="${widgetOrigin.replace(/\/$/, '')}/embed.js"
  data-widget-key="${widgetKey}"
  data-position="bottom-right"
  async
></script>`;

const inlineSnippet = `<div
  data-triage-inline
  data-widget-key="${widgetKey}"
  data-height="620px"
></div>`;

export default function PlaygroundPage() {
  return (
    <main className="page">
      <WidgetLoader origin={widgetOrigin} widgetKey={widgetKey} />

      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">Triage Playground</div>
          <nav className="tabs" aria-label="Demo contexts">
            <a className="tab" href="#marketing">
              Marketing site
            </a>
            <a className="tab" href="#app">
              Web app
            </a>
          </nav>
        </div>
      </header>

      <section className="shell hero">
        <div className="eyebrow">Widget playground</div>
        <h1>Drop feedback into the places customers already are.</h1>
        <p className="lead">
          Test the same Triage widget on a public site, inside a product shell,
          and as an inline form. The demo passes user and account metadata into
          the backend so triage can use real context.
        </p>
      </section>

      <section className="shell embed-card" aria-label="Current embed snippet">
        <strong>Floating launcher</strong>
        <code>{embedSnippet}</code>
      </section>

      <section className="shell embed-card" aria-label="Inline embed snippet">
        <strong>Inline placement</strong>
        <code>{inlineSnippet}</code>
      </section>

      <section className="shell grid">
        <MarketingDemo />
        <ProductDemo />
      </section>

      <section className="shell inline-demo">
        <div>
          <span className="eyebrow">Inline placement</span>
          <h2>Feedback form embedded directly inside a page section.</h2>
          <p>
            This uses the same widget key and backend, but renders where the
            company places the inline container.
          </p>
        </div>
        <div
          className="inline-frame"
          data-triage-inline
          data-widget-key={widgetKey}
          data-height="620px"
        />
      </section>
    </main>
  );
}

function MarketingDemo() {
  return (
    <article id="marketing" className="panel marketing">
      <nav>
        <strong>LedgerLane</strong>
        <a className="button" href="#pricing">
          Request demo
        </a>
      </nav>
      <section>
        <span className="eyebrow">Public website</span>
        <h2>Catch confusion before it becomes churn.</h2>
        <p>
          Visitors can flag broken forms, pricing friction, unclear copy, or
          missing product information without searching for a contact address.
        </p>
        <p>
          Open the floating launcher and submit feedback as a public visitor.
        </p>
      </section>
    </article>
  );
}

function ProductDemo() {
  return (
    <article id="app" className="panel product">
      <aside className="sidebar">
        <strong>LedgerLane App</strong>
        <a className="side-item active" href="#dashboard">
          Dashboard
        </a>
        <a className="side-item" href="#reports">
          Reports
        </a>
        <a className="side-item" href="#billing">
          Billing
        </a>
        <a className="side-item" href="#settings">
          Settings
        </a>
      </aside>
      <section className="workspace">
        <div className="app-header">
          <div>
            <span className="eyebrow">Authenticated app</span>
            <h2 style={{ margin: '8px 0 0', letterSpacing: '-0.04em' }}>
              Revenue workspace
            </h2>
          </div>
          <button className="button" type="button">
            Export
          </button>
        </div>
        <div className="metric-row">
          <div className="metric">
            Accounts
            <strong>1,248</strong>
          </div>
          <div className="metric">
            Plan
            <strong>Scale</strong>
          </div>
          <div className="metric">
            Env
            <strong>Live</strong>
          </div>
        </div>
        <div className="table">
          <div className="row">
            <span>Report</span>
            <span>Status</span>
            <span>Owner</span>
          </div>
          <div className="row">
            <span>Revenue rollup</span>
            <span>Delayed</span>
            <span>Mara</span>
          </div>
          <div className="row">
            <span>Usage analytics</span>
            <span>Healthy</span>
            <span>Platform</span>
          </div>
          <div className="row">
            <span>Billing sync</span>
            <span>Review</span>
            <span>Ops</span>
          </div>
        </div>
      </section>
    </article>
  );
}
