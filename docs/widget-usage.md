# Widget Usage Guide

Use the versioned script for new installs:

```html
<script
  src="https://dashboard.example.com/embed/v1"
  data-widget-key="YOUR_WIDGET_KEY"
  async
></script>
```

For aggressive CDN caching, pin the immutable URL:

```html
<script
  src="https://dashboard.example.com/embed/v1.c8b5f1a4.js"
  data-widget-key="YOUR_WIDGET_KEY"
  async
></script>
```

`/embed.js` remains as a compatibility alias.

## Identify Users

```html
<script>
  window.TriageWidget?.identify(
    { email: "ada@example.com", name: "Ada", id: "user_123" },
    { plan: "enterprise", accountId: "acct_123" },
    { userHash: "SERVER_GENERATED_HMAC" }
  );
</script>
```

If identity verification is enabled, compute:

```text
hex(HMAC-SHA256(widgetSecret, lowercasedEmailOrUserId))
```

Never expose `widgetSecret` in browser code.

## Runtime API

```ts
TriageWidget.boot({ widgetKey, user, userHash, locale });
TriageWidget.shutdown();
TriageWidget.identify(user, metadata, { userHash });
TriageWidget.update(metadata);
TriageWidget.prefill({ title: "Checkout broken", severity: "high" });
TriageWidget.open({ type: "bug", prefill: { title: "Checkout broken" } });
TriageWidget.close();
```

Calls can be queued before the script loads:

```html
<script>
  window.triageQ = window.triageQ || [];
  triageQ.push(["identify", { email: "ada@example.com" }]);
  triageQ.push(["open", { type: "bug" }]);
</script>
```

## Custom Open Buttons

```html
<button data-triage-open data-triage-type="bug">Report a bug</button>
```

The built-in `?` shortcut opens the widget unless the user is typing into a
form field. `Escape` closes the widget panel.

## Inline Embed

```html
<div data-triage-inline data-widget-key="YOUR_WIDGET_KEY" data-height="640px"></div>
```

## Security Checklist

- Add exact production origins or wildcard subdomains in the widget editor.
- Leave dev mode off for production.
- Enable identity verification for logged-in web apps.
- Set a privacy policy URL before enabling required consent.
- Rotate the widget secret if it was exposed.
