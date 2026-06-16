const embedSnippet = `<script
  src="https://your-triage.example.com/embed.js"
  data-widget-key="local-dev-widget"
  async
></script>`;

const navItems = [
  ['Product', '#product'],
  ['Routing', '#routing'],
  ['Ask', '#ask'],
  ['Proof', '#proof'],
  ['Deploy', '#deploy'],
];

const valueTiles = [
  {
    icon: 'inbox',
    title: 'Capture without another portal',
    copy: 'Drop one widget on a site, inside an app, or beside a help article. Triage keeps the raw submission, cleaned summary, metadata, source URL, consent, and attachments together.',
  },
  {
    icon: 'route',
    title: 'Route by the facts you already know',
    copy: 'Escalation rules can read plan, environment, account size, product area, affected users, and custom fields before a human opens the queue.',
  },
  {
    icon: 'handoff',
    title: 'Handoff only when work is real',
    copy: 'Create Linear or Jira issues from high-signal feedback with the context attached. Keep questions, praise, and low-confidence notes inside the internal queue.',
  },
  {
    icon: 'kb',
    title: 'Deflect the repeat questions',
    copy: 'Import support articles, index them, and show matching answers before a ticket is created. The queue stays focused on new signal.',
  },
  {
    icon: 'ask',
    title: 'Ask the queue directly',
    copy: 'Ask what changed this week, which tickets are still open, or where documentation is missing. Answers cite the records behind them.',
  },
  {
    icon: 'lock',
    title: 'Keep the stack in your hands',
    copy: 'Run the dashboard, API, worker, Postgres, Redis, storage, and model provider keys under your own deployment policy.',
  },
];

const routingRows = [
  [
    'critical',
    'enterprise checkout',
    'Plan upgrade breaks payment confirmation',
    'Linear draft ready',
  ],
  [
    'expedite',
    'production latency',
    'Reports loading in 18.4 seconds for EU accounts',
    'owner suggested',
  ],
  [
    'watch',
    'docs gap',
    'Webhook retry behavior unclear after failed delivery',
    'KB match missing',
  ],
  [
    'none',
    'product idea',
    'Expose saved dashboard views to teammates',
    'kept in queue',
  ],
];

const proofStats = [
  ['47.2%', 'less queue noise after KB deflection'],
  ['18 min', 'median first owner on critical feedback'],
  ['6 fields', 'average context attached before triage'],
];

const askQuestions = [
  'What are the top unresolved issues this week?',
  'Which knowledge gaps should we fix first?',
  'Summarize critical feedback that is still open.',
];

export default function MarketingPage() {
  return (
    <main className="page">
      <a className="skip-link" href="#product">
        Skip to product
      </a>

      <nav className="shell nav" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Triage home">
          <span className="brand-mark" aria-hidden>
            <Icon name="mark" />
          </span>
          <span>Triage</span>
        </a>
        <div className="navlinks">
          {navItems.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
        <a className="nav-cta" href="#deploy">
          Self-host the pipeline
        </a>
      </nav>

      <section className="shell hero">
        <div className="hero-copy">
          <p className="kicker">Self-hosted feedback operations</p>
          <h1>Customer signal, turned into accountable product work.</h1>
          <p className="lead">
            Triage gives product, support, and engineering teams one owned path
            from widget submission to triage, escalation, internal handling, and
            external issue handoff.
          </p>
          <div className="actions">
            <a className="button primary" href="#deploy">
              Deploy it yourself
              <Icon name="arrow" />
            </a>
            <a className="button secondary" href="#product">
              See the workflow
            </a>
          </div>
        </div>

        <div
          className="hero-visual"
          aria-label="Triage product workflow preview"
        >
          <div className="photo-slab" aria-hidden />
          <ProductConsole />
        </div>
      </section>

      <section className="shell intro-band" id="product">
        <div className="intro-copy">
          <p className="kicker">The operating path</p>
          <h2>Most feedback tools stop at collection. Triage keeps going.</h2>
        </div>
        <p>
          The product is built for teams that need context before tickets become
          engineering work: who sent it, where it happened, what account it
          affects, whether docs can answer it, and which escalation rule made it
          urgent.
        </p>
      </section>

      <section className="shell value-grid" aria-label="Product value">
        <article className="value-card wide">
          <div className="card-icon">
            <Icon name={valueTiles[0].icon} />
          </div>
          <h3>{valueTiles[0].title}</h3>
          <p>{valueTiles[0].copy}</p>
          <div className="signal-form" aria-hidden>
            <span>email</span>
            <span>message</span>
            <span>metadata</span>
            <span>attachments</span>
          </div>
        </article>

        {valueTiles.slice(1).map((tile) => (
          <article className="value-card" key={tile.title}>
            <div className="card-icon">
              <Icon name={tile.icon} />
            </div>
            <h3>{tile.title}</h3>
            <p>{tile.copy}</p>
          </article>
        ))}
      </section>

      <section className="shell routing" id="routing">
        <div className="routing-copy">
          <p className="kicker">Escalation logic</p>
          <h2>Rules that read like an ops runbook, not a black box.</h2>
          <p>
            Use AI classification for the first pass, then keep routing
            decisions explicit. A support lead can inspect why feedback was
            marked critical, adjust the rule, and leave the automation in place.
          </p>
        </div>
        <div className="routing-ledger">
          {routingRows.map(([tier, source, title, state]) => (
            <article key={title} className="ledger-row">
              <span className={`tier tier-${tier}`}>{tier}</span>
              <span className="source">{source}</span>
              <strong>{title}</strong>
              <span className="state">{state}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="shell ask-section" id="ask">
        <div className="ask-copy">
          <p className="kicker">Ask Triage</p>
          <h2>Ask about the queue without building another report.</h2>
          <p>
            The Ask tool reads tickets, knowledge-base articles, deflection
            events, and feedback analytics. It stays read-only and cites the
            records it used, so a product lead can follow the answer back to the
            source.
          </p>
        </div>
        <div className="ask-console" aria-label="Ask Triage preview">
          <div className="ask-thread">
            <p className="ask-message ask-message-user">
              Which knowledge gaps should we fix first?
            </p>
            <div className="ask-message ask-message-system">
              <p>
                Start with webhook retry behavior and checkout confirmation.
                Both show open tickets and failed self-service searches.
              </p>
              <div className="ask-citations" aria-label="Example citations">
                <span>S1 ticket</span>
                <span>S2 KB gap</span>
                <span>S3 deflection</span>
              </div>
            </div>
          </div>
          <div className="ask-prompts">
            {askQuestions.map((question) => (
              <span key={question}>{question}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="proof" id="proof">
        <div className="shell proof-inner">
          <div className="proof-panel">
            <p className="kicker">Why teams switch</p>
            <h2>
              Cleaner queues. Better handoffs. Fewer orphaned customer reports.
            </h2>
            <p>
              Triage is opinionated about the handoff moment. Engineering should
              receive structured work, not vague screenshots. Support should
              keep ownership when a conversation does not need a backlog issue.
            </p>
          </div>
          <div className="proof-stats" aria-label="Operational outcomes">
            {proofStats.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell deploy" id="deploy">
        <div className="deploy-copy">
          <p className="kicker">Deployment</p>
          <h2>
            Install the widget with one script tag. Own everything behind it.
          </h2>
          <p>
            Host the dashboard and backend yourself, connect your storage and
            provider keys, then place the embed wherever customers already are.
          </p>
          <a
            className="button primary"
            href="https://github.com/obafemiolorungbon/triage"
            target="_blank"
            rel="noreferrer"
          >
            View repository
            <Icon name="arrow" />
          </a>
        </div>
        <div className="code-card">
          <div className="code-top">
            <span>embed.js</span>
            <span>async loader</span>
          </div>
          <pre className="code">{embedSnippet}</pre>
        </div>
      </section>

      <footer className="shell footer">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden>
            <Icon name="mark" />
          </span>
          <span>Triage</span>
        </a>
        <p>Open-source feedback operations for teams that want control.</p>
        <div>
          <a href="#product">Product</a>
          <a href="#deploy">Deploy</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </footer>
    </main>
  );
}

function ProductConsole() {
  return (
    <div className="product-console">
      <div className="console-top">
        <span>workspace/triage</span>
        <span>live queue</span>
      </div>
      <div className="console-grid">
        <aside>
          <strong>Queue</strong>
          <span className="active">Incoming</span>
          <span>Mine</span>
          <span>Ask</span>
          <span>Widgets</span>
          <span>KB</span>
        </aside>
        <section className="console-main">
          <div className="console-head">
            <div>
              <span>open tickets</span>
              <strong>143</strong>
            </div>
            <div>
              <span>critical</span>
              <strong>12</strong>
            </div>
          </div>
          <div className="ticket-stack">
            {routingRows.slice(0, 3).map(([tier, source, title]) => (
              <article key={title}>
                <div>
                  <span>{source}</span>
                  <span>{tier}</span>
                </div>
                <strong>{title}</strong>
              </article>
            ))}
          </div>
        </section>
        <section className="widget-card">
          <span>Feedback widget</span>
          <strong>What happened?</strong>
          <p>Attach a screenshot, account plan, source URL, and message.</p>
          <button>Send feedback</button>
        </section>
      </div>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
  };

  if (name === 'mark') {
    return (
      <svg {...common}>
        <path
          d="M5 7h14M7 12h10M9.5 17h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path
          d="M5 12h13M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'route') {
    return (
      <svg {...common}>
        <path
          d="M6 5h4a4 4 0 010 8H8a3 3 0 000 6h10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M17 16l3 3-3 3M5 5h.01"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'handoff') {
    return (
      <svg {...common}>
        <path
          d="M4 7h7v10H4zM13 5h7v14h-7zM8 12h8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 9l3 3-3 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'kb') {
    return (
      <svg {...common}>
        <path
          d="M6 4.5A3.5 3.5 0 019.5 1H18v18H9.5A3.5 3.5 0 006 22.5v-18z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M10 7h5M10 11h5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'ask') {
    return (
      <svg {...common}>
        <path
          d="M5 6.5h14M5 12h9M5 17.5h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M16 14l3 3-3 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'lock') {
    return (
      <svg {...common}>
        <path
          d="M7 10V8a5 5 0 0110 0v2M6 10h12v10H6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 14v2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M4 6h16v12H4zM7 9h5M7 13h10M15 9h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
