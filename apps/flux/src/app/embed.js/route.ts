import { NextRequest } from 'next/server';

export function GET(req: NextRequest) {
  const base = new URL(req.url).origin;
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:4200';
  const js = `
(function () {
  if (window.TriageWidget && window.TriageWidget.__ready) return;
  console.warn('[Triage] /embed.js is stable today, but /embed/v1 is the versioned embed route.');
  var WIDGET_ORIGIN = ${JSON.stringify(base)};
  var API_ORIGIN = ${JSON.stringify(apiBase)};
  var script = document.currentScript;
  var scriptWidgetKey = script && script.getAttribute('data-widget-key');
  var scriptPosition = script && script.getAttribute('data-position');
  var scriptUserHash = script && script.getAttribute('data-user-hash');
  var position = scriptPosition || 'bottom-right';
  var context = { user: {}, metadata: {}, userHash: scriptUserHash || undefined, prefill: {}, source: { url: location.href, title: document.title } };
  var panel;
  var frame;
  var button;
  var config;
  var variant;
  var visible = false;
  var triggered = false;

  function fetchConfig(widgetKey) {
    return fetch(API_ORIGIN.replace(/\\/$/, '') + '/api/v1/widget/config/' + encodeURIComponent(widgetKey))
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
  }

  function updateSource() {
    context.source = { url: location.href, title: document.title };
  }

  function enrichedContext() {
    updateSource();
    var metadata = {};
    Object.keys(context.metadata || {}).forEach(function (key) { metadata[key] = context.metadata[key]; });
    if (variant) {
      metadata.widgetVariantId = variant.id;
      metadata.widgetVariantName = variant.name;
    }
    return { user: context.user || {}, metadata: metadata, userHash: context.userHash, prefill: context.prefill || {}, source: context.source };
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function chooseVariant(widgetKey, variants) {
    var enabled = (variants || []).filter(function (item) { return item && item.weight > 0; });
    if (!enabled.length) return null;
    var storageKey = 'triage-widget-variant:' + widgetKey;
    var existing = null;
    try { existing = localStorage.getItem(storageKey); } catch (_) {}
    var match = existing && enabled.filter(function (item) { return item.id === existing; })[0];
    if (match) return match;
    var total = enabled.reduce(function (sum, item) { return sum + item.weight; }, 0);
    var point = Math.random() * total;
    for (var i = 0; i < enabled.length; i++) {
      point -= enabled[i].weight;
      if (point <= 0) {
        try { localStorage.setItem(storageKey, enabled[i].id); } catch (_) {}
        return enabled[i];
      }
    }
    return enabled[0];
  }

  function pathMatches(rule) {
    if (!rule) return false;
    var value = String(rule.value || '');
    var target = rule.kind === 'url' ? location.href : location.pathname;
    if (rule.op === 'equals') return target === value;
    if (rule.op === 'contains') return target.indexOf(value) > -1;
    return target.indexOf(value) === 0;
  }

  function pageAllowed(rules) {
    if (!rules) return true;
    var include = Array.isArray(rules.include) ? rules.include : [];
    var exclude = Array.isArray(rules.exclude) ? rules.exclude : [];
    if (exclude.some(pathMatches)) return false;
    if (include.length && !include.some(pathMatches)) return false;
    return true;
  }

  function valueAt(path) {
    var parts = String(path || '').split('.');
    var root = parts[0] === 'user' ? context.user : context.metadata;
    var start = parts[0] === 'user' || parts[0] === 'metadata' ? 1 : 0;
    var value = root;
    for (var i = start; i < parts.length; i++) {
      if (value == null) return undefined;
      value = value[parts[i]];
    }
    return value;
  }

  function predicatePass(item) {
    var actual = valueAt(item.field);
    if (item.op === 'exists') return actual !== undefined && actual !== null && actual !== '';
    if (item.op === 'in') return Array.isArray(item.value) && item.value.indexOf(actual) > -1;
    if (item.op === 'contains') return String(actual || '').indexOf(String(item.value || '')) > -1;
    return String(actual) === String(item.value);
  }

  function audienceAllowed(rules) {
    if (!rules) return true;
    if (Array.isArray(rules.all) && !rules.all.every(predicatePass)) return false;
    if (Array.isArray(rules.any) && rules.any.length && !rules.any.some(predicatePass)) return false;
    return true;
  }

  function canRender() {
    return pageAllowed(config && config.pageRules) && audienceAllowed(config && config.audienceRules);
  }

  function setButtonVisible(next) {
    visible = next;
    if (button) button.style.display = next ? 'inline-flex' : 'none';
  }

  function activeTheme() {
    return (config && config.theme) || {};
  }

  function themeValue(key, fallback) {
    var theme = activeTheme();
    return theme && theme[key] != null && theme[key] !== '' ? theme[key] : fallback;
  }

  function launcherBackground() {
    return (variant && variant.brandColor) || (config && config.brandColor) || '#B8D66B';
  }

  function launcherForeground() {
    return (config && config.accentColor) || '#151412';
  }

  function launcherLabel() {
    return (variant && variant.launcherLabel) || themeValue('launcherLabel', 'Feedback');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function iconSvg() {
    var icon = String(themeValue('launcherIcon', 'message-circle') || 'message-circle');
    if (/^https:\\/\\//.test(icon)) {
      return '<img src="' + icon.replace(/"/g, '%22') + '" alt="" style="width:17px;height:17px;object-fit:contain" />';
    }
    var paths = {
      'message-circle': '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.6-.8L3 21l1.8-5A8.3 8.3 0 1 1 21 11.5Z" />',
      bug: '<path d="M8 2l1.5 2h5L16 2M9 9h6M7 13H3M21 13h-4M7 17l-3 2M20 19l-3-2M12 4a6 6 0 0 1 6 6v4a6 6 0 0 1-12 0v-4a6 6 0 0 1 6-6Z" />',
      'help-circle': '<circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.5 2.5 0 1 1 4.3 1.8c-.9.8-1.6 1.3-1.6 2.7M12 17h.01" />',
      lightbulb: '<path d="M9 18h6M10 22h4M8.5 14.5a6 6 0 1 1 7 0c-.9.8-1.5 1.8-1.5 3.5h-4c0-1.7-.6-2.7-1.5-3.5Z" />',
      'thumbs-up': '<path d="M7 10v11M7 11l5-8c1-1.6 3.5-.9 3.5 1v5H20c1.7 0 2.8 1.7 2.2 3.3L20 18a5 5 0 0 1-4.7 3H6" />',
      megaphone: '<path d="M3 11v3a2 2 0 0 0 2 2h2l3 5v-5l9 3V6l-9 3H5a2 2 0 0 0-2 2Z" />',
      star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z" />'
    };
    var path = paths[icon] || paths['message-circle'];
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px">' + path + '</svg>';
  }

  function fontCss() {
    var font = themeValue('fontFamily', 'system');
    if (!font || font === 'system') return 'system-ui,-apple-system,Segoe UI,sans-serif';
    return font + ',system-ui,-apple-system,Segoe UI,sans-serif';
  }

  function shadowCss() {
    var shadow = themeValue('shadow', 'soft');
    if (shadow === 'none') return 'none';
    if (shadow === 'deep') return '0 28px 90px rgba(0,0,0,.42)';
    return '0 18px 50px rgba(0,0,0,.26)';
  }

  function launcherPositionCss() {
    if (position === 'bottom-center') return ['left:50%', 'bottom:20px', 'transform:translateX(-50%)'];
    if (position === 'top-left') return ['left:20px', 'top:20px'];
    if (position === 'top-right') return ['right:20px', 'top:20px'];
    if (position === 'side-tab-left') {
      return [
        'left:0',
        'top:50%',
        'transform:translateY(-50%)',
        'writing-mode:vertical-rl',
        'border-radius:0 12px 12px 0',
        'padding:16px 10px'
      ];
    }
    if (position === 'side-tab-right') {
      return [
        'right:0',
        'top:50%',
        'transform:translateY(-50%) rotate(180deg)',
        'writing-mode:vertical-rl',
        'border-radius:12px 0 0 12px',
        'padding:16px 10px'
      ];
    }
    if (position === 'bottom-left') return ['left:20px', 'bottom:20px'];
    return ['right:20px', 'bottom:20px'];
  }

  function panelPositionCss() {
    if (position === 'bottom-center') return ['left:50%', 'bottom:76px', 'transform:translateX(-50%)'];
    if (position === 'top-left') return ['left:20px', 'top:76px'];
    if (position === 'top-right') return ['right:20px', 'top:76px'];
    if (position === 'side-tab-left') return ['left:20px', 'top:50%', 'transform:translateY(-50%)'];
    if (position === 'side-tab-right') return ['right:20px', 'top:50%', 'transform:translateY(-50%)'];
    if (position === 'bottom-left') return ['left:20px', 'bottom:76px'];
    return ['right:20px', 'bottom:76px'];
  }

  function ensureLauncher() {
    if (!scriptWidgetKey || button) return;
    button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = iconSvg() + '<span>' + escapeHtml(launcherLabel()) + '</span>';
    button.setAttribute('aria-label', 'Open feedback widget');
    button.style.cssText = [
      'position:fixed',
      'z-index:2147483000',
      'border:0',
      'border-radius:999px',
      'padding:12px 16px',
      'background:' + launcherBackground(),
      'color:' + launcherForeground(),
      'font:600 14px ' + fontCss(),
      'box-shadow:' + shadowCss(),
      'cursor:pointer',
      'display:none',
      'gap:8px',
      'align-items:center',
      'justify-content:center'
    ].concat(launcherPositionCss()).join(';');
    button.onclick = open;
    document.body.appendChild(button);

    panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed',
      'z-index:2147483000',
      'width:min(420px,calc(100vw - 32px))',
      'height:min(640px,calc(100dvh - 112px))',
      'display:none',
      'border-radius:' + themeValue('borderRadius', '18px'),
      'overflow:hidden',
      'box-shadow:' + shadowCss()
    ].concat(panelPositionCss()).join(';');
    frame = document.createElement('iframe');
    frame.src = WIDGET_ORIGIN + '/widget?widgetKey=' + encodeURIComponent(scriptWidgetKey) + '&hostOrigin=' + encodeURIComponent(location.origin);
    frame.title = 'Feedback widget';
    frame.allow = 'clipboard-write';
    frame.sandbox = 'allow-scripts allow-forms allow-same-origin allow-popups';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.loading = 'lazy';
    frame.style.cssText = 'width:100%;height:100%;border:0;background:transparent';
    frame.onload = sendContext;
    panel.appendChild(frame);
    document.body.appendChild(panel);
    updatePanelSize();
  }

  function updatePanelSize() {
    if (!panel) return;
    var vv = window.visualViewport;
    var availableHeight = vv ? vv.height : window.innerHeight;
    if (window.innerWidth < 640) {
      panel.style.left = '0';
      panel.style.right = '0';
      panel.style.bottom = '0';
      panel.style.top = 'auto';
      panel.style.transform = 'none';
      panel.style.width = '100vw';
      panel.style.height = Math.max(320, availableHeight) + 'px';
      panel.style.borderRadius = '18px 18px 0 0';
      return;
    }
    panel.style.width = 'min(420px,calc(100vw - 32px))';
    panel.style.height = 'min(640px,calc(100dvh - 112px))';
    panel.style.borderRadius = themeValue('borderRadius', '18px');
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    panel.style.transform = '';
    panelPositionCss().forEach(function (part) {
      var index = part.indexOf(':');
      if (index > -1) panel.style.setProperty(part.slice(0, index), part.slice(index + 1));
    });
  }

  function sendContext() {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'triage:context', payload: enrichedContext() }, WIDGET_ORIGIN);
    }
  }

  function open(opts) {
    opts = opts || {};
    if (opts.type || opts.prefill) {
      prefill(Object.assign({}, opts.prefill || {}, opts.type ? { type: opts.type } : {}));
    }
    ensureLauncher();
    if (!panel || !canRender()) return;
    updatePanelSize();
    panel.style.display = 'block';
    sendContext();
  }

  function close() {
    if (panel) panel.style.display = 'none';
  }

  function revealLauncher() {
    triggered = true;
    setButtonVisible(canRender());
  }

  function applyTrigger(trigger) {
    if (!button) return;
    var mode = (trigger && trigger.mode) || 'manual';
    if (mode === 'time_on_page') {
      window.setTimeout(revealLauncher, Math.max(0, Number(trigger.seconds || 0)) * 1000);
      return;
    }
    if (mode === 'scroll_depth_percent') {
      var threshold = Math.max(1, Number(trigger.percent || 50));
      var onScroll = function () {
        var height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        if ((scrollY / height) * 100 >= threshold) {
          window.removeEventListener('scroll', onScroll);
          revealLauncher();
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return;
    }
    if (mode === 'exit_intent') {
      var onMouse = function (event) {
        if (event.clientY <= 8) {
          document.removeEventListener('mouseleave', onMouse);
          revealLauncher();
        }
      };
      document.addEventListener('mouseleave', onMouse);
      return;
    }
    revealLauncher();
  }

  function onDocumentClick(event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-triage-open]') : null;
    if (!target) return;
    event.preventDefault();
    open({ type: target.getAttribute('data-triage-type') || undefined });
  }

  function onDocumentKeydown(event) {
    if (event.key !== '?' || isTypingTarget(event.target)) return;
    event.preventDefault();
    open();
  }

  function refreshVisibility() {
    if (!button) return;
    setButtonVisible(triggered && canRender());
  }

  function mountInline(target) {
    var key = target.getAttribute('data-widget-key') || scriptWidgetKey;
    if (!key || target.__triageMounted) return;
    target.__triageMounted = true;
    fetchConfig(key).then(function (inlineConfig) {
      if (inlineConfig && inlineConfig.inlineEnabled === false) return;
      config = key === scriptWidgetKey ? config : inlineConfig;
      if (!pageAllowed(inlineConfig && inlineConfig.pageRules)) return;
      var inlineFrame = document.createElement('iframe');
      inlineFrame.src = WIDGET_ORIGIN + '/widget?widgetKey=' + encodeURIComponent(key) + '&hostOrigin=' + encodeURIComponent(location.origin);
      inlineFrame.title = 'Feedback form';
      inlineFrame.allow = 'clipboard-write';
      inlineFrame.sandbox = 'allow-scripts allow-forms allow-same-origin allow-popups';
      inlineFrame.referrerPolicy = 'strict-origin-when-cross-origin';
      inlineFrame.style.cssText = 'width:100%;height:' + (target.getAttribute('data-height') || '640px') + ';border:0;background:transparent;border-radius:' + (((inlineConfig && inlineConfig.theme) || {}).borderRadius || '18px') + ';overflow:hidden';
      inlineFrame.onload = function () {
        inlineFrame.contentWindow && inlineFrame.contentWindow.postMessage({ type: 'triage:context', payload: enrichedContext() }, WIDGET_ORIGIN);
      };
      target.appendChild(inlineFrame);
    });
  }

  function boot() {
    Array.prototype.slice.call(document.querySelectorAll('[data-triage-inline]')).forEach(mountInline);
    if (!scriptWidgetKey) return;
    fetchConfig(scriptWidgetKey).then(function (nextConfig) {
      config = nextConfig || {};
      position = scriptPosition || config.position || position;
      variant = chooseVariant(scriptWidgetKey, config.variants);
      ensureLauncher();
      applyTrigger(config.triggerConfig);
      refreshVisibility();
    });
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== WIDGET_ORIGIN) return;
    if (frame && event.source !== frame.contentWindow) return;
    if (event.data && event.data.type === 'triage:close') close();
  });

  window.addEventListener('popstate', refreshVisibility);
  window.addEventListener('resize', updatePanelSize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updatePanelSize);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);

  function prefill(values) {
    context.prefill = Object.assign({}, context.prefill || {}, values || {});
    sendContext();
  }

  window.TriageWidget = {
    __ready: true,
    boot: function (opts) {
      opts = opts || {};
      if (opts.widgetKey) scriptWidgetKey = opts.widgetKey;
      if (opts.user) context.user = opts.user;
      if (opts.userHash) context.userHash = opts.userHash;
      if (opts.locale) context.locale = opts.locale;
      boot();
    },
    shutdown: function () {
      if (button && button.parentNode) button.parentNode.removeChild(button);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      button = null;
      panel = null;
      frame = null;
      visible = false;
      triggered = false;
    },
    identify: function (user, metadata, opts) {
      context.user = user || {};
      context.metadata = metadata || {};
      context.userHash = opts && opts.userHash ? opts.userHash : context.userHash;
      sendContext();
      refreshVisibility();
    },
    update: function (metadata) {
      context.metadata = Object.assign({}, context.metadata || {}, metadata || {});
      sendContext();
      refreshVisibility();
    },
    open: open,
    close: close,
    prefill: prefill
  };

  var q = window.triageQ || [];
  window.triageQ = { push: function (call) {
    if (!call || !call.length) return;
    var method = call[0];
    if (window.TriageWidget[method]) window.TriageWidget[method].apply(window.TriageWidget, call.slice(1));
  }};
  if (Array.isArray(q)) q.forEach(window.triageQ.push);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();`;

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
