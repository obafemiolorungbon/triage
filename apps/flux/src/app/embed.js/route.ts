import { NextRequest } from 'next/server';

export function GET(req: NextRequest) {
  const base = new URL(req.url).origin;
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:4200';
  const js = `
(function () {
  if (window.TriageWidget && window.TriageWidget.__ready) return;
  var WIDGET_ORIGIN = ${JSON.stringify(base)};
  var API_ORIGIN = ${JSON.stringify(apiBase)};
  var script = document.currentScript;
  var scriptWidgetKey = script && script.getAttribute('data-widget-key');
  var scriptPosition = script && script.getAttribute('data-position');
  var position = scriptPosition || 'bottom-right';
  var context = { user: {}, metadata: {}, source: { url: location.href, title: document.title } };
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
    return { user: context.user || {}, metadata: metadata, source: context.source };
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
    button.textContent = launcherLabel();
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
    frame.src = WIDGET_ORIGIN + '/widget?widgetKey=' + encodeURIComponent(scriptWidgetKey);
    frame.title = 'Feedback widget';
    frame.allow = 'clipboard-write';
    frame.sandbox = 'allow-scripts allow-forms allow-same-origin allow-popups';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.loading = 'lazy';
    frame.style.cssText = 'width:100%;height:100%;border:0;background:transparent';
    frame.onload = sendContext;
    panel.appendChild(frame);
    document.body.appendChild(panel);
  }

  function sendContext() {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'triage:context', payload: enrichedContext() }, WIDGET_ORIGIN);
    }
  }

  function open() {
    ensureLauncher();
    if (!panel || !canRender()) return;
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
      inlineFrame.src = WIDGET_ORIGIN + '/widget?widgetKey=' + encodeURIComponent(key);
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

  window.TriageWidget = {
    __ready: true,
    identify: function (user, metadata) {
      context.user = user || {};
      context.metadata = metadata || {};
      sendContext();
      refreshVisibility();
    },
    update: function (metadata) {
      context.metadata = Object.assign({}, context.metadata || {}, metadata || {});
      sendContext();
      refreshVisibility();
    },
    open: open,
    close: close
  };

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
