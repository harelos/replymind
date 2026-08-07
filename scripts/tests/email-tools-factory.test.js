'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildEmailTools } = require('../email-tools/factory');
const { validateGeneratedOutput } = require('../email-tools/output-validation');

const SITE_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.resolve(__dirname, '..', 'fixtures', 'email-tools');

function tempDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'replymind-email-tools-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('tiny valid fixture generates functional tools, an audience hub, assets, and a crawlable sitemap', t => {
  const outputRoot = tempDirectory(t);
  const report = buildEmailTools({
    siteRoot: SITE_ROOT,
    batchDir: path.join(FIXTURES, 'valid'),
    outputRoot,
    expectedToolsPerBatch: 2,
    similarityThreshold: 0.72,
    updated: '2026-08-06',
    write: true
  });

  assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  assert.deepEqual(report.acceptedBatches, ['tiny-operations']);
  assert.equal(report.generatedToolPages, 2);
  assert.equal(report.generatedAudienceHubs, 1);
  assert.equal(report.existingToolPagesPreserved, 20);

  const generatedTool = path.join(outputRoot, 'email-tools', 'stakeholder-decision-summary-email-builder', 'index.html');
  const audienceHub = path.join(outputRoot, 'email-tools', 'audiences', 'tiny-operations', 'index.html');
  const audienceIndex = path.join(outputRoot, 'email-tools', 'audiences', 'index.html');
  for (const file of [generatedTool, audienceHub, audienceIndex]) assert.equal(fs.existsSync(file), true, file);
  assert.equal(fs.existsSync(path.join(outputRoot, 'email-tools', 'assets', 'batch-tools.js')), true);
  assert.equal(fs.existsSync(path.join(outputRoot, 'email-tools', 'assets', 'batch-tools.css')), true);

  const html = fs.readFileSync(generatedTool, 'utf8');
  assert.match(html, /data-batch-tool/);
  assert.match(html, /"@type":"WebApplication"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /utm_source=replymind_email_tools/);
  assert.match(html, /\/email-tools\/scope-change-approval-email-builder\//);

  const sitemap = fs.readFileSync(path.join(outputRoot, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /stakeholder-decision-summary-email-builder/);
  assert.match(sitemap, /email-tools\/audiences\/tiny-operations/);
  assert.match(sitemap, /polite-decline-email-generator/);

  for (const existingSlug of ['polite-decline-email-generator', 'follow-up-email-generator']) {
    assert.equal(fs.existsSync(path.join(outputRoot, 'email-tools', existingSlug, 'index.html')), false, 'existing pages must not be overwritten into generated output');
  }
});

test('production default rejects a batch that does not contain exactly 50 tools', () => {
  const report = buildEmailTools({
    siteRoot: SITE_ROOT,
    batchDir: path.join(FIXTURES, 'valid'),
    expectedToolsPerBatch: 50,
    updated: '2026-08-06',
    write: false
  });
  assert.equal(report.ok, false);
  assert.equal(report.generatedToolPages, 0);
  assert.deepEqual(report.rejectedBatches, ['tiny-operations']);
  assert.ok(report.issues.some(value => value.code === 'schema.exact_tool_count'));
  assert.ok(!report.manifest.urls.some(url => url.includes('stakeholder-decision-summary-email-builder')));
});

test('invalid tools reject their whole batch and never enter publication files or sitemap', () => {
  const report = buildEmailTools({
    siteRoot: SITE_ROOT,
    batchDir: path.join(FIXTURES, 'invalid'),
    expectedToolsPerBatch: 2,
    updated: '2026-08-06',
    write: false
  });
  assert.equal(report.ok, false);
  assert.equal(report.generatedToolPages, 0);
  assert.deepEqual(report.rejectedBatches, ['broken-batch']);
  for (const code of ['duplicate.slug', 'duplicate.h1', 'duplicate.metaDescription', 'template.unknown_placeholder', 'content.thin_tool', 'schema.field_type', 'similarity.high_pairwise']) {
    assert.ok(report.issues.some(value => value.code === code), `missing ${code}`);
  }
  assert.equal(report.files.has('email-tools/duplicate-tool/index.html'), false);
  assert.doesNotMatch(report.files.get('sitemap.xml'), /duplicate-tool/);
});

test('a later valid build prunes stale pages named by the previous generated manifest', t => {
  const outputRoot = tempDirectory(t);
  const staleRelative = 'email-tools/stale-generated-tool/index.html';
  const staleFile = path.join(outputRoot, ...staleRelative.split('/'));
  fs.mkdirSync(path.dirname(staleFile), { recursive: true });
  fs.writeFileSync(staleFile, '<!doctype html><title>stale</title>', 'utf8');
  const manifestPath = path.join(outputRoot, 'email-tools', '.generated-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    tools: ['stale-generated-tool'],
    urls: ['https://www.replymind.xyz/email-tools/stale-generated-tool/'],
    paths: [staleRelative, 'email-tools/.generated-manifest.json']
  }), 'utf8');

  const report = buildEmailTools({
    siteRoot: SITE_ROOT,
    batchDir: path.join(FIXTURES, 'valid'),
    outputRoot,
    expectedToolsPerBatch: 2,
    updated: '2026-08-06',
    write: true
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  assert.equal(fs.existsSync(staleFile), false);
  assert.doesNotMatch(fs.readFileSync(path.join(outputRoot, 'sitemap.xml'), 'utf8'), /stale-generated-tool/);
});

test('post-render validator detects broken internal links and invalid JSON-LD', () => {
  const report = buildEmailTools({
    siteRoot: SITE_ROOT,
    batchDir: path.join(FIXTURES, 'valid'),
    expectedToolsPerBatch: 2,
    updated: '2026-08-06',
    write: false
  });
  assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
  const files = new Map(report.files);
  const target = 'email-tools/stakeholder-decision-summary-email-builder/index.html';
  files.set(target, files.get(target)
    .replace('/email-tools/scope-change-approval-email-builder/', '/email-tools/does-not-exist/')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">{broken}</script>'));
  const issues = validateGeneratedOutput(files, SITE_ROOT);
  assert.ok(issues.some(value => value.code === 'output.broken_link' && value.file === target));
  assert.ok(issues.some(value => value.code === 'output.jsonld_invalid' && value.file === target));
});
