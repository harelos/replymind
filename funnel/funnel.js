(function () {
  'use strict';
  var responsiveFix = document.createElement('link');
  responsiveFix.rel = 'stylesheet';
  responsiveFix.href = 'mobile-fix.css';
  document.head.appendChild(responsiveFix);

  var ATTR_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
  var EXPERIMENTS = {
    advertorial: { id: 'rm_adv_2026_08', variants: ['story','reasons'] },
    sales: { id: 'rm_sales_2026_08', variants: ['long','short'] },
    checkout: { id: 'rm_checkout_2026_08', variants: ['style1','style2'] }
  };
  var params = new URLSearchParams(location.search);
  var stored;
  try { stored = JSON.parse(localStorage.getItem('rm_funnel_state_v2') || '{}'); } catch (e) { stored = {}; }
  stored.visitorId = stored.visitorId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));
  stored.attribution = stored.attribution || {};
  ATTR_KEYS.forEach(function (key) { if (params.get(key)) stored.attribution[key] = params.get(key).slice(0, 200); });
  stored.firstLanding = stored.firstLanding || location.pathname;
  stored.landingAt = stored.landingAt || new Date().toISOString();

  function hash(input) {
    var h = 2166136261;
    for (var i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  stored.assignments = stored.assignments || {};
  Object.keys(EXPERIMENTS).forEach(function (key) {
    var exp = EXPERIMENTS[key];
    var override = params.get('exp_' + key);
    var chosen = exp.variants.indexOf(override) >= 0 ? override : exp.variants[hash(stored.visitorId + exp.id) % exp.variants.length];
    stored.assignments[key] = { experimentId: exp.id, variant: chosen };
  });
  localStorage.setItem('rm_funnel_state_v2', JSON.stringify(stored));

  function consentGranted() { return localStorage.getItem('rm_analytics_consent_v2') === 'granted'; }
  function event(name, detail) {
    if (!consentGranted()) return;
    var payload = Object.assign({ event: name, at: new Date().toISOString(), path: location.pathname, visitorId: stored.visitorId }, detail || {});
    var queue;
    try { queue = JSON.parse(localStorage.getItem('rm_event_queue_v2') || '[]'); } catch (e) { queue = []; }
    queue.push(payload);
    localStorage.setItem('rm_event_queue_v2', JSON.stringify(queue.slice(-100)));
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent('replymind:analytics', { detail: payload }));
    var analyticsPayload = {
      event_id: stored.visitorId + ':' + name + ':' + Date.now(),
      event_type: name,
      occurred_at: payload.at,
      property_id: 'replymind',
      funnel_id: 'replymind-main',
      visitor_id: stored.visitorId,
      session_id: sessionStorage.getItem('rm_session_id_v2') || stored.visitorId,
      consent: 'analytics',
      metadata: Object.assign({ path: location.pathname }, detail || {})
    };
    sessionStorage.setItem('rm_session_id_v2', analyticsPayload.session_id);
    try {
      var body = new Blob([JSON.stringify(analyticsPayload)], { type: 'application/json' });
      if (navigator.sendBeacon) navigator.sendBeacon('https://analytics.replymind.xyz/v1/events', body);
      else fetch('https://analytics.replymind.xyz/v1/events', { method: 'POST', body: body, keepalive: true, mode: 'cors' }).catch(function () {});
    } catch (e) {}
  }
  function destination(stage) {
    var a = stored.assignments;
    if (stage === 'advertorial') return '/funnel/advertorial-' + (a.advertorial.variant === 'story' ? 'story' : '7-reasons') + '.html';
    if (stage === 'sales') return '/funnel/sales-' + a.sales.variant + '.html';
    if (stage === 'checkout') return '/funnel/checkout-' + a.checkout.variant + '.html';
    return '/';
  }
  function carry(url) {
    var u = new URL(url, location.origin);
    Object.keys(stored.attribution).forEach(function (key) { u.searchParams.set(key, stored.attribution[key]); });
    return u.pathname + u.search;
  }
  function viewEvent() {
    var stage = document.body.dataset.stage;
    var name = stage === 'advertorial' ? 'advertorial_view' : stage === 'sales' ? 'sales_view' : null;
    if (!name || sessionStorage.getItem('rm_view_' + name)) return;
    sessionStorage.setItem('rm_view_' + name, '1');
    event(name, { page: location.pathname });
  }
  function wireLinks() {
    document.querySelectorAll('[data-next]').forEach(function (link) {
      var stage = link.dataset.next;
      link.href = carry(destination(stage));
      link.addEventListener('click', function () {
        var current = document.body.dataset.stage;
        event(current === 'advertorial' ? 'advertorial_cta_clicked' : 'sales_cta_clicked', { destination: stage, label: link.textContent.trim().slice(0, 90) });
      });
    });
  }
  function addStickySalesCta() {
    if (document.body.dataset.stage !== 'sales' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cta = document.querySelector('[data-next="checkout"]');
    if (!cta) return;
    var bar = document.createElement('div');
    bar.className = 'sticky-cta';
    bar.innerHTML = '<a class="cta" data-next="checkout" href="">Start ReplyMind Pro</a>';
    document.body.appendChild(bar);
    var link = bar.querySelector('a');
    link.href = cta.href;
    link.addEventListener('click', function () { event('sales_cta_clicked', { destination: 'checkout', label: 'Start ReplyMind Pro' }); });
    window.addEventListener('scroll', function () { bar.classList.toggle('visible', window.scrollY > window.innerHeight * .25); }, { passive: true });
  }
  function consentBox() {
    if (localStorage.getItem('rm_analytics_consent_v2')) return;
    var box = document.createElement('aside');
    box.className = 'consent';
    box.setAttribute('role','dialog');
    box.setAttribute('aria-label','Analytics choice');
    box.innerHTML = '<p><strong>Your privacy, your choice.</strong> Optional first-party events help us understand which pages are useful. They never include message text, generated replies, recipients, contact names, or notes. <a href="/privacy.html">Privacy policy</a></p><div class="consent-actions"><button data-consent="denied">Necessary only</button><button class="primary" data-consent="granted">Allow analytics</button></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (!e.target.dataset.consent) return;
      localStorage.setItem('rm_analytics_consent_v2', e.target.dataset.consent);
      box.remove();
    });
  }
  viewEvent();
  wireLinks();
  addStickySalesCta();
  consentBox();
  window.ReplyMindFunnel = { state: stored, event: event, destination: destination, carry: carry };
})();
