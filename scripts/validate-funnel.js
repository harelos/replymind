'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const funnel = path.join(root, 'funnel');
const requiredPages = ['index.html','advertorial-story.html','advertorial-7-reasons.html','sales-long.html','sales-short.html','checkout-style1.html','checkout-style2.html','success.html','cancel.html'];
const requiredArtifacts = ['CONTENT_MAP.md','MEDIA_MANIFEST.md','CLAIM_LEDGER.md','CTA_ROUTE_MAP.md','EVENT_INSTRUMENTATION_MAP.md'];
const errors = [];
const read = (file) => fs.readFileSync(path.join(funnel, file), 'utf8');

requiredPages.forEach((file) => { if (!fs.existsSync(path.join(funnel, file))) errors.push('Missing page ' + file); });
requiredArtifacts.forEach((file) => { if (!fs.existsSync(path.join(funnel, file))) errors.push('Missing artifact ' + file); });

for (const file of requiredPages) {
  if (!fs.existsSync(path.join(funnel, file))) continue;
  const html = read(file);
  if (!/<meta name="viewport"/.test(html)) errors.push(file + ': missing viewport');
  for (const match of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
    for (const rawUrl of match[1].split(',').map((item) => item.trim().split(/\s+/)[0])) {
      if (/^(https?:|mailto:|#|data:)/.test(rawUrl) || !rawUrl) continue;
      const target = rawUrl.startsWith('/') ? path.join(root, rawUrl.split(/[?#]/)[0]) : path.join(funnel, rawUrl.split(/[?#]/)[0]);
      if (!fs.existsSync(target)) errors.push(file + ': broken local link ' + rawUrl);
    }
  }
}

const htmlFiles = requiredPages.map(read).join('\n');
const visibleText = htmlFiles.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, ' ').replace(/\s+/g, ' ');
['offer flow','funnel','cold traffic','conversion event','activation','product evidence','current build','testable route','deterministic','avatar','verified destination','commercial content','internal category','campaign','variant','mechanism','developer grammar','marketing grammar','event map','test route'].forEach((term) => {
  if (visibleText.toLowerCase().includes(term)) errors.push('Forbidden visitor wording: ' + term);
});
if (/https:\/\/api\.openai\.com|sk-[A-Za-z0-9]|pdl_live_apikey|PADDLE_API_KEY\s*[:=]\s*['"][^'"]+/.test(htmlFiles)) errors.push('Possible secret or direct AI provider URL in visitor pages');
if (!htmlFiles.includes('ReplyMind Pro') || !htmlFiles.includes('$19') || !htmlFiles.includes('$180') || !htmlFiles.includes('14-day refund')) errors.push('Missing verified pricing/refund terms');

const visualBudgets = {
  'advertorial-story.html': { min: 10, max: 10 },
  'advertorial-7-reasons.html': { min: 13, max: 13 },
  'sales-long.html': { min: 14, max: 18 },
  'sales-short.html': { min: 8, max: 8 }
};
for (const [file, budget] of Object.entries(visualBudgets)) {
  const count = (read(file).match(/class="[^"]*(?:hero-visual|split-visual|reason-visual|offer)[^"]*"/g) || []).length;
  if (count < budget.min || count > budget.max) errors.push(`${file}: visual placement count ${count}, expected ${budget.min}-${budget.max}`);
}

const js = read('funnel.js');
const checkout = read('checkout.js');
['advertorial_view','advertorial_cta_clicked','sales_view','sales_cta_clicked','checkout_started','plan_selected','purchase_completed','purchase_failed','consentGranted','fbclid','utm_source'].forEach((marker) => { if (!js.includes(marker) && !checkout.includes(marker)) errors.push('Missing event/consent marker: ' + marker); });
if (!js.includes("if (!consentGranted()) return")) errors.push('Analytics is not consent-gated');
['Paddle.Initialize','Paddle.Checkout.open','checkout.completed','customData','successUrl'].forEach((marker) => { if (!checkout.includes(marker)) errors.push('Missing Paddle marker: ' + marker); });

const config = read('paddle-config.js');
['live_fdc940732c5e24247a4132b2e80','pri_01kxcm80r76x68s6j9ca9sxezh','pri_01kxcm80zff1am9sb9yw0c7hfq'].forEach((marker) => { if (!config.includes(marker)) errors.push('Missing real Paddle catalog value: ' + marker); });
if (/PADDLE_/.test(config)) errors.push('Paddle config still contains placeholders');

const responsiveDir = path.join(funnel, 'assets', 'responsive');
['reply-tone-pressure-4x5.webp','reply-tone-pressure-16x9.webp','reply-confidence-4x5.webp','reply-confidence-16x9.webp','in-gmail-560.webp','in-gmail-960.webp','voice-vs-ai-560.webp','memory-560.webp','gmail-linkedin-560.webp','followups-560.webp'].forEach((file) => { if (!fs.existsSync(path.join(responsiveDir, file))) errors.push('Missing responsive asset ' + file); });

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Funnel contract QA passed: pages, artifacts, routes, consent gate, verified Paddle catalog, event markers, responsive assets, and visitor-copy guardrails.');
