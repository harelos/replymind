(function () {
  'use strict';
  var cfg = window.REPLYMIND_PADDLE;
  var root = document.getElementById('checkoutMount');
  var params = new URLSearchParams(location.search);
  var billing = params.get('billing') === 'annual' ? 'annual' : 'monthly';
  var accountEmail = (params.get('email') || '').trim().toLowerCase();
  var initialized = false;

  function fail(message) {
    root.innerHTML = '<div class="error-box"><strong>Checkout is not available right now.</strong><br>' + message + '<br>Please contact <a href="mailto:hello@replymind.xyz">hello@replymind.xyz</a>.</div>';
  }
  function validConfig() {
    return cfg && cfg.clientToken && cfg.monthlyPriceId && cfg.annualPriceId && !/PADDLE_/.test(cfg.clientToken + cfg.monthlyPriceId + cfg.annualPriceId);
  }
  if (!validConfig()) { fail('Paddle billing is not configured.'); return; }
  if (!window.Paddle) { fail('Paddle checkout could not load. Check your connection and try again.'); return; }
  if (cfg.environment === 'sandbox') window.Paddle.Environment.set('sandbox');

  function setPrice() {
    document.querySelectorAll('[data-price]').forEach(function (el) { el.innerHTML = billing === 'annual' ? '$180 <small>/ year</small>' : '$19 <small>/ month</small>'; });
    document.querySelectorAll('[data-billing]').forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.billing === billing ? 'true' : 'false'); });
  }
  function initialize() {
    if (initialized) return;
    window.Paddle.Initialize({
      token: cfg.clientToken,
      eventCallback: function (ev) {
        if (!ev || !ev.name) return;
        var name = ev.name.toLowerCase();
        if (name === 'checkout.completed') {
          ReplyMindFunnel.event('purchase_completed', { billing: billing });
          location.assign(ReplyMindFunnel.carry('/funnel/success.html'));
        } else if (name.indexOf('failed') >= 0 || name.indexOf('error') >= 0) {
          ReplyMindFunnel.event('purchase_failed', { billing: billing, error_type: ev.name });
        }
      }
    });
    initialized = true;
  }
  function openCheckout() {
    initialize();
    var priceId = billing === 'annual' ? cfg.annualPriceId : cfg.monthlyPriceId;
    ReplyMindFunnel.event('checkout_started', { billing: billing, checkout_style: document.body.dataset.checkoutStyle || 'unknown' });
    window.Paddle.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      customer: accountEmail ? { email: accountEmail } : undefined,
      customData: { account_email: accountEmail, product: 'replymind', billing: billing },
      settings: { displayMode: 'inline', frameTarget: 'checkoutMount', frameInitialHeight: 520, frameStyle: 'width:100%;min-width:312px;background:transparent', successUrl: location.origin + '/funnel/success.html' }
    });
  }
  function showEmailGate() {
    root.innerHTML = '<div class="email-gate"><h3>Which account should we upgrade?</h3><p>Use the email you use—or will use—for ReplyMind. Paddle will prefill it, and the purchase can be matched to your account.</p><div class="email-row"><input id="accountEmailInput" type="email" autocomplete="email" placeholder="you@example.com"><button class="cta" id="continueCheckoutBtn">Continue securely</button></div><p class="email-error" id="accountEmailError" aria-live="polite"></p></div>';
    var input = document.getElementById('accountEmailInput');
    document.getElementById('continueCheckoutBtn').addEventListener('click', function () {
      var value = input.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { document.getElementById('accountEmailError').textContent = 'Enter a valid account email.'; input.focus(); return; }
      accountEmail = value;
      openCheckout();
    });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') document.getElementById('continueCheckoutBtn').click(); });
    input.focus();
  }
  setPrice();
  document.querySelectorAll('[data-billing]').forEach(function (button) {
    button.addEventListener('click', function () { billing = button.dataset.billing; setPrice(); ReplyMindFunnel.event('plan_selected', { billing: billing }); });
  });
  document.getElementById('payButton').addEventListener('click', function () { if (accountEmail) openCheckout(); else showEmailGate(); });
  root.innerHTML = '<p class="secure">Secure billing opens in Paddle. ReplyMind never receives your full card number.</p>';
})();
