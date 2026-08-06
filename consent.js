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

  // A centred modal rather than a dismissible bottom bar: the bar could simply be
  // ignored, and a visitor who never decides counts as "no consent", so their order
  // goes unmeasured. Forcing a CHOICE is legitimate; forcing consent is not — hence
  // two genuinely equivalent buttons and full access to the site either way.
  var CSS = [
    '.aiz-overlay{position:fixed;inset:0;z-index:99999;background:rgba(24,14,10,.55);',
    'display:flex;align-items:center;justify-content:center;padding:1.2rem;',
    'overflow-y:auto;-webkit-overflow-scrolling:touch;',
    'font-family:Inter,system-ui,sans-serif;color:#3b2a24}',
    '.aiz-modal{background:#fffdf9;max-width:460px;width:100%;border-radius:16px;',
    'padding:1.8rem 1.7rem 1.5rem;box-shadow:0 18px 50px rgba(0,0,0,.28);',
    'border:1px solid rgba(107,58,42,.14);margin:auto}',
    '.aiz-modal h2{font-family:Cinzel,Georgia,serif;font-size:1.15rem;color:#6b3a2a;',
    'margin:0 0 .7rem;font-weight:600}',
    '.aiz-modal p{margin:0 0 .7rem;font-size:.88rem;line-height:1.6}',
    '.aiz-modal p.aiz-fine{font-size:.78rem;color:#7a6459;margin-bottom:1.2rem}',
    '.aiz-modal a{color:#6b3a2a}',
    '.aiz-actions{display:flex;gap:.7rem}',
    // Equal size, weight and hit area. A de-emphasised "reject" is the exact pattern
    // the EDPB cookie-banner taskforce targets and CNIL has fined over.
    '.aiz-actions button{flex:1 1 0;font:inherit;font-size:.88rem;font-weight:600;',
    'padding:.75rem 1rem;border-radius:9px;cursor:pointer;border:1.5px solid #6b3a2a;',
    'line-height:1.2}',
    '.aiz-actions .aiz-accept{background:#6b3a2a;color:#fff}',
    '.aiz-actions .aiz-reject{background:transparent;color:#6b3a2a}',
    '.aiz-actions button:focus-visible{outline:3px solid rgba(107,58,42,.35);outline-offset:2px}',
    '@media(max-width:420px){.aiz-actions{flex-direction:column}}',
    // Stops the page behind the modal from scrolling (landing.html scrolls; the chat
    // page already sets overflow:hidden itself).
    'body.aiz-consent-open{overflow:hidden}',
  ].join('');

  function showBanner() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.className = 'aiz-overlay';

    var modal = document.createElement('div');
    modal.className = 'aiz-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'aizConsentTitle');

    var title = document.createElement('h2');
    title.id = 'aizConsentTitle';
    title.textContent = 'Než začneme';

    var text = document.createElement('p');
    text.textContent = 'Abychom věděli, komu Zdenčina pomoc dává smysl, měříme pomocí '
      + 'Google Analytics a Mety, kolik lidí web navštíví a kolik si výklad objedná. '
      + 'Pomáhá nám to oslovovat lidi, kterým máme co nabídnout — a neplýtvat jinde.';

    var fine = document.createElement('p');
    fine.className = 'aiz-fine';
    fine.innerHTML = 'Obsah vašich dotazů ani odpovědí se nikam neodesílá — nikdy. '
      + 'Pokud měření odmítnete, web funguje úplně stejně. '
      + 'Podrobnosti v <a href="' + POLICY_URL + '">zásadách ochrany osobních údajů</a>.';

    var actions = document.createElement('div');
    actions.className = 'aiz-actions';

    var reject = document.createElement('button');
    reject.className = 'aiz-reject';
    reject.type = 'button';
    reject.textContent = 'Odmítnout';

    var accept = document.createElement('button');
    accept.className = 'aiz-accept';
    accept.type = 'button';
    accept.textContent = 'Souhlasím';

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.classList.remove('aiz-consent-open');
    }

    reject.addEventListener('click', function () { remember('denied'); close(); });
    accept.addEventListener('click', function () { remember('granted'); loadTags(); close(); });

    actions.appendChild(reject);
    actions.appendChild(accept);
    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(fine);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('aiz-consent-open');

    // Deliberately NOT closable by Escape or by clicking the backdrop: a dismissal that
    // records no choice is what left orders unmeasured with the previous bottom bar.
    // Both buttons stay one keystroke apart, so no one is trapped.
    accept.focus();
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
