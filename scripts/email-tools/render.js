'use strict';

const BASE_URL = 'https://www.replymind.xyz';
const STORE_URL = 'https://chromewebstore.google.com/detail/replymind-%E2%80%94-replies-in-yo/pjoibapolglmhhkgfilpgailpjmiekai';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function titleFor(tool) {
  return `${tool.name} | ReplyMind`;
}

function toolUrl(slug) {
  return `${BASE_URL}/email-tools/${slug}/`;
}

function audienceUrl(batch) {
  return `${BASE_URL}/email-tools/audiences/${batch}/`;
}

function storeUrl(campaign, content) {
  const query = new URLSearchParams({
    utm_source: 'replymind_email_tools',
    utm_medium: 'organic',
    utm_campaign: campaign,
    utm_content: content
  });
  return `${STORE_URL}?${query.toString()}`;
}

function renderField(field, index) {
  const id = `tool-field-${index}-${field.key}`;
  const common = `id="${escapeHtml(id)}" name="${escapeHtml(field.key)}" placeholder="${escapeHtml(field.placeholder)}"${field.required ? ' required' : ''}`;
  const control = field.type === 'textarea'
    ? `<textarea ${common} rows="4"></textarea>`
    : `<input ${common} type="${escapeHtml(field.type)}">`;
  return `<div class="field"><label for="${escapeHtml(id)}">${escapeHtml(field.label)}${field.required ? ' <span aria-hidden="true">*</span>' : ''}</label>${control}</div>`;
}

function graphTypes(graph) {
  return { '@context': 'https://schema.org', '@graph': graph };
}

function renderToolPage(batch, tool, related) {
  const canonical = toolUrl(tool.slug);
  const title = titleFor(tool);
  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'ReplyMind', item: `${BASE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Free email tools', item: `${BASE_URL}/email-tools/` },
    { '@type': 'ListItem', position: 3, name: batch.avatar, item: audienceUrl(batch.batch) },
    { '@type': 'ListItem', position: 4, name: tool.name, item: canonical }
  ];
  const schema = graphTypes([
    {
      '@type': 'WebApplication',
      '@id': `${canonical}#application`,
      name: tool.name,
      url: canonical,
      applicationCategory: 'CommunicationApplication',
      browserRequirements: 'Requires a modern web browser with JavaScript enabled',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: tool.metaDescription,
      audience: { '@type': 'Audience', audienceType: tool.audience }
    },
    { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: breadcrumbs },
    {
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: tool.faqs.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    }
  ]);
  const config = {
    subjectTemplate: tool.subjectTemplate,
    bodyTemplate: tool.bodyTemplate,
    fields: tool.fields.map(field => ({ key: field.key, required: field.required }))
  };
  const heroCta = storeUrl(tool.slug, 'tool_header');
  const footerCta = storeUrl(tool.slug, 'tool_footer');

  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(tool.metaDescription)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="ReplyMind">
  <meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(tool.metaDescription)}"><meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(tool.metaDescription)}">
  <link rel="stylesheet" href="../assets/tools.css"><link rel="stylesheet" href="../assets/batch-tools.css">
  <script type="application/ld+json">${safeJson(schema)}</script>
</head><body data-generated-tool="${escapeHtml(tool.slug)}">
  <header class="site-nav"><div class="shell nav-inner"><a class="brand" href="/">Reply<em>Mind</em></a><nav class="nav-links" aria-label="Main navigation"><a href="/email-tools/">Free email tools</a><a href="/email-tools/audiences/">Audience hubs</a><a class="button" href="${heroCta}">Add to Chrome</a></nav></div></header>
  <main>
    <nav class="shell crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/email-tools/">Email tools</a> / <a href="/email-tools/audiences/${escapeHtml(batch.batch)}/">${escapeHtml(batch.avatar)}</a> / ${escapeHtml(tool.name)}</nav>
    <section class="shell hero"><div><div class="kicker">Free ${escapeHtml(tool.intent)} tool for ${escapeHtml(tool.audience)}</div><h1>${escapeHtml(tool.h1)}</h1><p class="lede">${escapeHtml(tool.intro)}</p><div class="proof"><span>Runs in your browser</span><span>No signup</span><span>Editable output</span></div></div>
      <form class="tool" data-batch-tool novalidate>
        <h2>${escapeHtml(tool.name)}</h2><p class="tool-intro">Complete the details below to build an editable starting point. Your entries stay on this page.</p>
        ${tool.fields.map(renderField).join('\n        ')}
        <div class="tool-actions"><button class="button" type="submit">Build the message</button><button class="button secondary" type="button" data-copy hidden>Copy message</button></div>
        <p class="tool-note">This builder uses the local template shown on this page. It does not upload form inputs.</p>
        <div class="tool-error" data-tool-error role="alert" hidden></div>
        <section class="generated-message" data-generated-message hidden aria-live="polite"><div class="generated-subject"><strong>Subject:</strong> <span data-generated-subject></span></div><pre data-generated-body></pre></section>
        <div class="copy-status" data-copy-status aria-live="polite"></div>
        <script type="application/json" data-tool-config>${safeJson(config)}</script>
      </form>
    </section>
    <section class="band"><div class="shell section-grid"><div><div class="eyebrow">The communication job</div><h2>${escapeHtml(tool.outcome)}</h2></div><div class="steps">${tool.guidance.map(item => `<article class="step"><div><p>${escapeHtml(item)}</p></div></article>`).join('')}</div></div></section>
    <section class="shell section"><div class="section-grid"><div><div class="eyebrow">Avoid these mistakes</div><h2>Keep the message useful and credible.</h2></div><div class="section-copy"><ul class="pitfalls">${tool.pitfalls.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div>
      <div class="examples">${tool.examples.map(example => `<article class="example"><div class="example-label">${escapeHtml(example.label)}</div><h3>${escapeHtml(example.input)}</h3><p>${escapeHtml(example.output)}</p></article>`).join('')}</div>
    </section>
    <section class="band"><div class="shell section-grid"><div><div class="eyebrow">Questions</div><h2>${escapeHtml(tool.name)} FAQ</h2></div><div class="faq">${tool.faqs.map(item => `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join('')}</div></div></section>
    <section class="shell section"><div class="eyebrow">Related tools</div><h2>Continue the conversation.</h2><div class="related">${related.map(item => `<a href="/email-tools/${escapeHtml(item.slug)}/"><span>${item.existing ? 'Existing free tool' : 'Related free tool'}</span>${escapeHtml(item.name || item.keyword || item.slug)}</a>`).join('')}</div></section>
    <section class="cta"><div class="shell cta-inner"><div><h2>Draft inside Gmail and LinkedIn in your writing style.</h2><p>ReplyMind uses the intent you choose, the active conversation, and the context you decide to save. You review every draft before anything is sent.</p></div><a class="button" href="${footerCta}">Add ReplyMind to Chrome</a></div></section>
  </main>
  <footer class="site-footer"><div class="shell footer-inner"><span>&copy; 2026 ReplyMind by TIGERBESTBRANDS LLC</span><span><a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a> &middot; <a href="/support.html">Support</a></span></div></footer>
  <script src="../assets/batch-tools.js" defer></script>
</body></html>`;
}

function renderAudienceHub(batch, tools) {
  const canonical = audienceUrl(batch.batch);
  const title = `${batch.avatar}: Free Email Tools | ReplyMind`;
  const description = `Free browser-based email and message tools for ${batch.avatar.toLowerCase()}. Build useful drafts locally, with no signup required.`;
  const schema = graphTypes([
    {
      '@type': 'CollectionPage', '@id': `${canonical}#collection`, name: title, url: canonical,
      description, hasPart: tools.map(tool => ({ '@type': 'WebApplication', name: tool.name, url: toolUrl(tool.slug) }))
    },
    {
      '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ReplyMind', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Free email tools', item: `${BASE_URL}/email-tools/` },
        { '@type': 'ListItem', position: 3, name: 'Audience hubs', item: `${BASE_URL}/email-tools/audiences/` },
        { '@type': 'ListItem', position: 4, name: batch.avatar, item: canonical }
      ]
    }
  ]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><link rel="stylesheet" href="../../assets/tools.css"><link rel="stylesheet" href="../../assets/batch-tools.css"><script type="application/ld+json">${safeJson(schema)}</script></head><body data-generated-audience="${escapeHtml(batch.batch)}">
  <header class="site-nav"><div class="shell nav-inner"><a class="brand" href="/">Reply<em>Mind</em></a><nav class="nav-links"><a href="/email-tools/">Free email tools</a><a href="/email-tools/audiences/">Audience hubs</a><a class="button" href="${storeUrl(batch.batch, 'audience_header')}">Add to Chrome</a></nav></div></header>
  <main><nav class="shell crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/email-tools/">Email tools</a> / <a href="/email-tools/audiences/">Audience hubs</a> / ${escapeHtml(batch.avatar)}</nav>
    <section class="shell hero audience-hero"><div><div class="kicker">${tools.length} practical communication tools</div><h1>Email tools for ${escapeHtml(batch.avatar.toLowerCase())}.</h1><p class="lede">Handle recurring communication jobs with focused, private builders. Each page produces an editable draft locally and explains what makes the message work.</p><div class="proof"><span>${tools.length} functional tools</span><span>No signup</span><span>Inputs stay local</span></div></div></section>
    <section class="band"><div class="shell"><div class="eyebrow">Choose the job</div><h2>What do you need to write?</h2><div class="tool-directory">${tools.map(tool => `<a href="/email-tools/${escapeHtml(tool.slug)}/"><span>${escapeHtml(tool.intent)}</span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.outcome)}</small></a>`).join('')}</div></div></section>
    <section class="cta"><div class="shell cta-inner"><div><h2>Turn the starting point into a reply that sounds like you.</h2><p>Use ReplyMind inside Gmail and LinkedIn when the active conversation, contact context, and your writing style matter.</p></div><a class="button" href="${storeUrl(batch.batch, 'audience_footer')}">Add ReplyMind to Chrome</a></div></section>
  </main><footer class="site-footer"><div class="shell footer-inner"><span>&copy; 2026 ReplyMind by TIGERBESTBRANDS LLC</span><span><a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a> &middot; <a href="/support.html">Support</a></span></div></footer></body></html>`;
}

function renderAudienceIndex(batches) {
  const canonical = `${BASE_URL}/email-tools/audiences/`;
  const title = 'Email Tools by Audience | ReplyMind';
  const description = 'Browse free, private email and message tools organized around the real communication jobs different professionals handle.';
  const schema = graphTypes([
    { '@type': 'CollectionPage', '@id': `${canonical}#collection`, name: title, url: canonical, description, hasPart: batches.map(batch => ({ '@type': 'CollectionPage', name: batch.avatar, url: audienceUrl(batch.batch) })) },
    { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ReplyMind', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Free email tools', item: `${BASE_URL}/email-tools/` },
      { '@type': 'ListItem', position: 3, name: 'Audience hubs', item: canonical }
    ] }
  ]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><link rel="stylesheet" href="../assets/tools.css"><link rel="stylesheet" href="../assets/batch-tools.css"><script type="application/ld+json">${safeJson(schema)}</script></head><body>
  <header class="site-nav"><div class="shell nav-inner"><a class="brand" href="/">Reply<em>Mind</em></a><nav class="nav-links"><a href="/email-tools/">Free email tools</a><a class="button" href="${storeUrl('audience_hubs', 'index_header')}">Add to Chrome</a></nav></div></header>
  <main><nav class="shell crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/email-tools/">Email tools</a> / Audience hubs</nav><section class="shell hero audience-hero"><div><div class="kicker">Built around real roles</div><h1>Find the email tool for your work.</h1><p class="lede">Browse focused builders by audience instead of searching through generic templates. Every tool runs locally in the browser and produces editable output.</p></div></section><section class="band"><div class="shell"><div class="tool-directory audience-directory">${batches.map(batch => `<a href="${escapeHtml(batch.batch)}/"><span>${batch.tools.length} tools</span><strong>${escapeHtml(batch.avatar)}</strong><small>Practical builders for recurring communication jobs.</small></a>`).join('')}</div></div></section></main>
  <footer class="site-footer"><div class="shell footer-inner"><span>&copy; 2026 ReplyMind by TIGERBESTBRANDS LLC</span><span><a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a> &middot; <a href="/support.html">Support</a></span></div></footer></body></html>`;
}

const batchToolsJs = `(function(){
  const form=document.querySelector('[data-batch-tool]');if(!form)return;
  const configNode=form.querySelector('[data-tool-config]');
  const errorNode=form.querySelector('[data-tool-error]');
  const outputNode=form.querySelector('[data-generated-message]');
  const subjectNode=form.querySelector('[data-generated-subject]');
  const bodyNode=form.querySelector('[data-generated-body]');
  const copyButton=form.querySelector('[data-copy]');
  const copyStatus=form.querySelector('[data-copy-status]');
  let config;
  try{config=JSON.parse(configNode.textContent);}catch(_){errorNode.textContent='This tool configuration could not be loaded.';errorNode.hidden=false;return;}
  const clean=value=>String(value==null?'':value).trim();
  const fill=(template,values)=>template.replace(/{{\\s*([A-Za-z][A-Za-z0-9_]*)\\s*}}/g,(_,key)=>clean(values[key]));
  const tidy=value=>value.replace(/[ \\t]+\\n/g,'\\n').replace(/ {2,}/g,' ').replace(/\\n{3,}/g,'\\n\\n').trim();
  form.addEventListener('submit',event=>{
    event.preventDefault();errorNode.hidden=true;copyStatus.textContent='';
    const data=new FormData(form);const values={};const missing=[];
    for(const field of config.fields){values[field.key]=clean(data.get(field.key));if(field.required&&!values[field.key])missing.push(field.key);}
    if(missing.length){errorNode.textContent='Complete the required fields before building the message.';errorNode.hidden=false;form.querySelector('[name="'+missing[0]+'"]')?.focus();return;}
    subjectNode.textContent=tidy(fill(config.subjectTemplate,values));bodyNode.textContent=tidy(fill(config.bodyTemplate,values));
    outputNode.hidden=false;copyButton.hidden=false;
  });
  copyButton.addEventListener('click',async()=>{
    const message='Subject: '+subjectNode.textContent+'\\n\\n'+bodyNode.textContent;
    try{await navigator.clipboard.writeText(message);copyStatus.textContent='Copied to clipboard';}
    catch(_){copyStatus.textContent='Select the generated message and copy it manually';}
  });
})();\n`;

const batchToolsCss = `.audience-hero{grid-template-columns:1fr;max-width:900px}.tool-directory{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.tool-directory>a{display:flex;min-width:0;flex-direction:column;gap:7px;padding:22px;background:var(--raised);border:1px solid var(--hair-2);color:var(--ink);text-decoration:none}.tool-directory span{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}.tool-directory strong{font-size:21px;line-height:1.25}.tool-directory small{font-size:14px;line-height:1.45;color:var(--muted)}.generated-message{display:block;margin-top:18px;border-left:4px solid var(--sage);background:var(--sage-wash);padding:16px}.generated-message[hidden]{display:none}.generated-subject{padding-bottom:10px;border-bottom:1px solid var(--hair-2);font-size:15px}.generated-message pre{margin:12px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:16px/1.55 var(--serif)}.tool-error{margin-top:12px;padding:10px 12px;border-left:4px solid var(--accent);background:var(--wash);font-size:14px}.pitfalls{margin:0;padding-left:22px}.pitfalls li{margin-bottom:12px}.audience-directory{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:850px){.tool-directory,.audience-directory{grid-template-columns:1fr}}\n`;

module.exports = {
  BASE_URL,
  STORE_URL,
  audienceUrl,
  batchToolsCss,
  batchToolsJs,
  escapeHtml,
  renderAudienceHub,
  renderAudienceIndex,
  renderToolPage,
  safeJson,
  storeUrl,
  titleFor,
  toolUrl
};
