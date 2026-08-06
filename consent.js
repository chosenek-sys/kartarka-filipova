/**
 * Cookie consent + measurement loader for aizdenka.com.
 *
 * Shared by landing.html and index.html. Nothing reaches Google or Meta before the
 * visitor opts in: the tag scripts are only injected on consent, and the refusal is
 * also forwarded to our own backend so the server-side Conversions API stays silent
 * too — it is the same processing purpose, just a different transport.
 *
 * Exposes:
 *   aizConsent.granted()          → boolean
 *   aizConsent.readTrackingIds()  → {clientId, sessionId, fbp, fbc, consent}
 *   aizTrack.ga(name, params)     → GA4 event (no-op without consent)
 *   aizTrack.meta(name, params)   → Meta standard event (no-op without consent)
 */
(function () {
  'use strict';

  var GA4_ID = 'G-S1FS00QJS1';
  var META_PIXEL_ID = '703651071435743';
  var STORAGE_KEY = 'aizdenka_consent_v1';
  var POLICY_URL = 'soukromi.html';

  var loaded = false;

  // ---------- consent storage ----------

  function stored() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null; // private mode / storage disabled
    }
  }

  function remember(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) { /* nothing we can do; banner simply reappears next visit */ }
  }

  function granted() {
    return stored() === 'granted';
  }

  // ---------- tag stubs (queue only — no network until consent) ----------

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Consent Mode v2 defaults must be queued before gtag.js is ever fetched.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });

  // Meta's standard stub, minus the script injection — calls buffer in fbq.queue
  // and replay once fbevents.js actually loads.
  if (!window.fbq) {
    var n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
  }
  window.fbq('consent', 'revoke');

  function injectScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function loadTags() {
    if (loaded) return;
    loaded = true;

    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
    injectScript('https://www.googletagmanager.com/gtag/js?id=' + GA4_ID);
    gtag('js', new Date());
    gtag('config', GA4_ID);

    injectScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('consent', 'grant');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  // ---------- attribution identifiers ----------

  function cookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  /**
   * Extract the GA4 session id from the _ga_<container> cookie.
   *
   * Google switched this cookie from the dot-delimited GS1 format to the
   * dollar-delimited GS2 format in May 2025:
   *   GS1.1.<sessionId>.<hits>...
   *   GS2.1.s<sessionId>$o<n>$g<n>$t<ts>$j<n>$l<n>$h<n>
   * Splitting GS2 on "." yields the whole tail as one token, which GA4 rejects — every
   * purchase would then open a fresh session and be filed as "direct", losing exactly
   * the campaign attribution this is for. Both formats are handled.
   */
  function parseGaSessionId(raw) {
    if (!raw) return null;

    if (raw.indexOf('$') === -1) {
      var parts = raw.split('.');          // legacy GS1
      return parts.length >= 3 ? parts[2] : null;
    }

    // GS2 uses prefixed key/value pairs precisely so Google can add or reorder fields
    // without breaking parsers — so scan for the "s" field instead of assuming it comes
    // first. ("d" / Join ID has been observed ahead of it in some samples.)
    var segments = raw.split('$');
    segments[0] = segments[0].replace(/^GS\d+\.\d+\./, '');
    for (var i = 0; i < segments.length; i++) {
      if (segments[i].charAt(0) === 's') return segments[i].slice(1) || null;
    }
    return null;
  }

  /**
   * Identifiers handed to our backend so the Stripe webhook can attribute the sale.
   *
   * session_id matters as much as client_id: without it the server event opens a new
   * GA4 session and the purchase is filed under "direct", losing the campaign that
   * actually paid for it.
   */
  function readTrackingIds() {
    if (!granted()) return { consent: false };

    var ga = cookie('_ga'); // GA1.<depth>.<cid1>.<cid2> — format unchanged by Google
    var clientId = null;
    if (ga) {
      var gaParts = ga.split('.');
      if (gaParts.length >= 4) clientId = gaParts[2] + '.' + gaParts[3];
    }

    var sessionId = parseGaSessionId(cookie('_ga_' + GA4_ID.replace(/^G-/, '')));

    return {
      consent: true,
      clientId: clientId,
      sessionId: sessionId,
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc'), // only present after an fbclid landing
      eventId: (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(16).slice(2),
    };
  }

  // ---------- banner ----------

  var CSS = [
    '.aiz-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;',
    'background:#fffdf9;border-top:1px solid rgba(107,58,42,.18);',
    'box-shadow:0 -4px 24px rgba(0,0,0,.10);padding:1rem 1.2rem;',
    'font-family:Inter,system-ui,sans-serif;color:#3b2a24}',
    '.aiz-consent-inner{max-width:900px;margin:0 auto;display:flex;gap:1rem;',
    'align-items:center;flex-wrap:wrap;justify-content:space-between}',
    '.aiz-consent p{margin:0;font-size:.86rem;line-height:1.55;flex:1 1 320px}',
    '.aiz-consent a{color:#6b3a2a;text-decoration:underline}',
    '.aiz-consent-actions{display:flex;gap:.6rem;flex:0 0 auto}',
    // Both buttons are deliberately the same size and weight — a de-emphasised
    // "reject" is a dark pattern under the EDPB cookie-banner guidance.
    '.aiz-consent button{font:inherit;font-size:.85rem;font-weight:600;',
    'padding:.6rem 1.4rem;border-radius:8px;cursor:pointer;border:1px solid #6b3a2a;',
    'min-width:132px}',
    '.aiz-consent .aiz-accept{background:#6b3a2a;color:#fff}',
    '.aiz-consent .aiz-reject{background:transparent;color:#6b3a2a}',
    '@media(max-width:560px){.aiz-consent-inner{flex-direction:column;align-items:stretch}',
    '.aiz-consent-actions{flex-direction:column}}',
    // The chat page pins everything to the viewport with body{overflow:hidden}, so a
    // fixed bottom bar would sit on top of the UI with no way to scroll past it.
    // Two selectors, both needed — and both win over style.css's mobile overrides on
    // specificity (0,2,0 vs 0,1,0) regardless of source order.
    //
    // .chat-input-area — the message box on the chat screen.
    'body.aiz-consent-open .chat-input-area{padding-bottom:calc(.8rem + var(--aiz-consent-h,170px))}',
    // .auth-screen — the login/registration form. This is the screen a FIRST-TIME
    // visitor actually sees, i.e. exactly the person the banner is shown to. It is
    // position:fixed, vertically centred and has no scroll container of its own, so on a
    // short viewport the submit button could end up under the banner, unreachable.
    // flex-start + overflow-y:auto gives it a real scroll fallback while the bar is up.
    'body.aiz-consent-open .auth-screen{justify-content:flex-start;overflow-y:auto;',
    '-webkit-overflow-scrolling:touch;',
    'padding-bottom:calc(2rem + var(--aiz-consent-h,170px))}',
  ].join('');

  function showBanner() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.className = 'aiz-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Souhlas s cookies');

    var inner = document.createElement('div');
    inner.className = 'aiz-consent-inner';

    var text = document.createElement('p');
    text.innerHTML = 'Rádi bychom měřili návštěvnost a účinnost naší reklamy pomocí '
      + 'Google Analytics a Meta Pixelu. Bez vašeho souhlasu se nic neodesílá. '
      + 'Více v <a href="' + POLICY_URL + '">zásadách ochrany osobních údajů</a>.';

    var actions = document.createElement('div');
    actions.className = 'aiz-consent-actions';

    var reject = document.createElement('button');
    reject.className = 'aiz-reject';
    reject.type = 'button';
    reject.textContent = 'Odmítnout';

    var accept = document.createElement('button');
    accept.className = 'aiz-accept';
    accept.type = 'button';
    accept.textContent = 'Přijmout';

    function close() {
      if (bar.parentNode) bar.parentNode.removeChild(bar);
      document.body.classList.remove('aiz-consent-open');
      document.body.style.removeProperty('--aiz-consent-h');
    }

    reject.addEventListener('click', function () { remember('denied'); close(); });
    accept.addEventListener('click', function () { remember('granted'); loadTags(); close(); });

    actions.appendChild(reject);
    actions.appendChild(accept);
    inner.appendChild(text);
    inner.appendChild(actions);
    bar.appendChild(inner);
    document.body.appendChild(bar);

    // Measured rather than hard-coded — the height depends on how the text wraps.
    // Re-measured afterwards because the first read happens before the web font has
    // swapped in and before any rotation, either of which re-wraps the paragraph.
    document.body.classList.add('aiz-consent-open');
    function measure() {
      if (!bar.parentNode) return;
      document.body.style.setProperty('--aiz-consent-h', bar.offsetHeight + 'px');
    }
    measure();
    if (window.ResizeObserver) {
      new window.ResizeObserver(measure).observe(bar);
    } else {
      window.addEventListener('resize', measure);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    }
  }

  function init() {
    if (granted()) {
      loadTags();
    } else if (stored() !== 'denied') {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---------- public API ----------

  /**
   * Forget the stored decision and ask again. Already-loaded tag scripts cannot be
   * unloaded from the live page, so we reload — after which nothing is injected unless
   * the visitor accepts again.
   */
  function revoke() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    window.location.reload();
  }

  window.aizConsent = { granted: granted, readTrackingIds: readTrackingIds, revoke: revoke };

  window.aizTrack = {
    ga: function (name, params) {
      if (!granted()) return;
      try { window.gtag('event', name, params || {}); } catch (e) { /* never break the app */ }
    },
    meta: function (name, params) {
      if (!granted()) return;
      try { window.fbq('track', name, params || {}); } catch (e) { /* never break the app */ }
    },
  };
})();
