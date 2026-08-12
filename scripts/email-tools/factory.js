'use strict';

const fs = require('fs');
const path = require('path');
const {
  normalized,
  readExistingCatalog,
  validateCollection
} = require('./validation');
const {
  BASE_URL,
  audienceUrl,
  batchToolsCss,
  batchToolsJs,
  renderAudienceHub,
  renderAudienceIndex,
  renderToolPage,
  toolUrl
} = require('./render');
const { validateGeneratedOutput } = require('./output-validation');

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function walkJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = directory => {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) files.push(absolute);
    }
  };
  visit(root);
  return files;
}

function loadBatchRecords(batchDir) {
  return walkJsonFiles(batchDir).map(absolute => {
    const file = toPosix(path.relative(batchDir, absolute));
    try {
      return { file, absolute, data: JSON.parse(fs.readFileSync(absolute, 'utf8')) };
    } catch (error) {
      return { file, absolute, data: null, parseError: error.message };
    }
  });
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function relatedFor(candidate, allCandidates, existingCatalog, limit = 4) {
  const tags = new Set(candidate.tool.relatedTags.map(normalized));
  const scored = allCandidates
    .filter(other => other.tool.slug !== candidate.tool.slug)
    .map(other => {
      const sharedTags = other.tool.relatedTags.map(normalized).filter(tag => tags.has(tag)).length;
      let score = sharedTags * 4;
      if (normalized(other.tool.intent) === normalized(candidate.tool.intent)) score += 3;
      if (other.batch === candidate.batch) score += 2;
      if (normalized(other.tool.audience) === normalized(candidate.tool.audience)) score += 1;
      return { ...other.tool, existing: false, score, tie: stableHash(`${candidate.tool.slug}:${other.tool.slug}`) };
    })
    .sort((left, right) => right.score - left.score || left.tie - right.tie || left.slug.localeCompare(right.slug));

  const output = [];
  for (const item of scored) {
    if (output.length >= limit) break;
    output.push(item);
  }
  if (output.length < limit && existingCatalog.length) {
    const orderedExisting = [...existingCatalog].sort((left, right) =>
      stableHash(`${candidate.tool.slug}:${left.slug}`) - stableHash(`${candidate.tool.slug}:${right.slug}`)
    );
    for (const item of orderedExisting) {
      if (output.length >= limit) break;
      if (!output.some(current => current.slug === item.slug)) output.push(item);
    }
  }
  return output;
}

function readSitemapUrls(siteRoot) {
  const sitemapPath = path.join(siteRoot, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return [];
  return [...fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].trim());
}

function readPreviousManifest(siteRoot) {
  const manifestPath = path.join(siteRoot, 'email-tools', '.generated-manifest.json');
  if (!fs.existsSync(manifestPath)) return { urls: [], paths: [], tools: [] };
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return {
      urls: Array.isArray(data.urls) ? data.urls.filter(value => typeof value === 'string') : [],
      paths: Array.isArray(data.paths) ? data.paths.filter(value => typeof value === 'string') : [],
      tools: Array.isArray(data.tools) ? data.tools.filter(value => typeof value === 'string') : []
    };
  } catch (_) {
    return { urls: [], paths: [], tools: [] };
  }
}

function renderSitemap(urls, updated) {
  const body = urls.map(url => `  <url><loc>${url}</loc><lastmod>${updated}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildVirtualFiles({ records, validRecords, existingCatalog, siteRoot, updated }) {
  const files = new Map();
  const validCandidates = [];
  const batchModels = validRecords.map(record => {
    const model = { batch: record.data.batch, avatar: record.data.avatar, tools: record.data.tools };
    model.tools.forEach((tool, index) => validCandidates.push({ batch: model.batch, model, tool, index }));
    return model;
  });

  files.set('email-tools/assets/batch-tools.js', batchToolsJs);
  files.set('email-tools/assets/batch-tools.css', batchToolsCss);
  for (const candidate of validCandidates) {
    const related = relatedFor(candidate, validCandidates, existingCatalog);
    files.set(`email-tools/${candidate.tool.slug}/index.html`, renderToolPage(candidate.model, candidate.tool, related));
  }
  for (const batch of batchModels) {
    files.set(`email-tools/audiences/${batch.batch}/index.html`, renderAudienceHub(batch, batch.tools));
  }
  if (batchModels.length) files.set('email-tools/audiences/index.html', renderAudienceIndex(batchModels));

  const previousManifest = readPreviousManifest(siteRoot);
  const invalidOrCurrentUrls = new Set(previousManifest.urls);
  for (const record of records) {
    if (!record.data || !Array.isArray(record.data.tools)) continue;
    for (const tool of record.data.tools) invalidOrCurrentUrls.add(toolUrl(tool.slug));
    if (record.data.batch) invalidOrCurrentUrls.add(audienceUrl(record.data.batch));
  }
  const audienceIndexUrl = `${BASE_URL}/email-tools/audiences/`;
  if (previousManifest.urls.includes(audienceIndexUrl)) invalidOrCurrentUrls.add(audienceIndexUrl);

  const baseUrls = readSitemapUrls(siteRoot).filter(url => !invalidOrCurrentUrls.has(url));
  const generatedUrls = [
    ...(batchModels.length ? [audienceIndexUrl] : []),
    ...batchModels.map(batch => audienceUrl(batch.batch)),
    ...validCandidates.map(candidate => toolUrl(candidate.tool.slug))
  ];
  const sitemapUrls = [...new Set([...baseUrls, ...generatedUrls])].sort((left, right) => left.localeCompare(right));
  files.set('sitemap.xml', renderSitemap(sitemapUrls, updated));

  const paths = [...files.keys()].filter(value => value !== 'email-tools/.generated-manifest.json');
  const manifest = {
    generatedAt: `${updated}T00:00:00.000Z`,
    batches: batchModels.map(batch => ({ batch: batch.batch, avatar: batch.avatar, toolCount: batch.tools.length })),
    tools: validCandidates.map(candidate => candidate.tool.slug),
    urls: generatedUrls,
    paths
  };
  files.set('email-tools/.generated-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, manifest, batchModels, validCandidates, sitemapUrls };
}

function ensureWithin(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(root, ...relativePath.split('/'));
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`Refusing to write outside output root: ${relativePath}`);
  return target;
}

function writeVirtualFiles(files, outputRoot) {
  for (const [relativePath, content] of files) {
    const target = ensureWithin(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
  }
}

function prunePreviousGenerated(outputRoot, previousManifest, nextPaths) {
  const allowedTools = new Set(previousManifest.tools || []);
  for (const relativePath of previousManifest.paths || []) {
    if (nextPaths.has(relativePath)) continue;
    const isSharedGenerated = relativePath === 'email-tools/assets/batch-tools.js'
      || relativePath === 'email-tools/assets/batch-tools.css'
      || relativePath === 'email-tools/.generated-manifest.json'
      || relativePath === 'email-tools/build-report.json'
      || relativePath.startsWith('email-tools/audiences/');
    const toolMatch = relativePath.match(/^email-tools\/([a-z0-9-]+)\//);
    const isKnownGeneratedTool = Boolean(toolMatch && allowedTools.has(toolMatch[1]));
    if (!isSharedGenerated && !isKnownGeneratedTool) continue;
    const target = ensureWithin(outputRoot, relativePath);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) continue;
    fs.rmSync(target, { force: true });
    const parent = path.dirname(target);
    if (parent !== path.resolve(outputRoot) && fs.existsSync(parent) && fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);
  }
}

function buildEmailTools(options) {
  const siteRoot = path.resolve(options.siteRoot);
  const batchDir = path.resolve(options.batchDir);
  const outputRoot = options.outputRoot ? path.resolve(options.outputRoot) : null;
  const updated = options.updated || new Date().toISOString().slice(0, 10);
  const expectedToolsPerBatch = Number.isInteger(options.expectedToolsPerBatch) ? options.expectedToolsPerBatch : 50;
  const similarityThreshold = typeof options.similarityThreshold === 'number' ? options.similarityThreshold : 0.72;

  const records = loadBatchRecords(batchDir);
  const existingCatalog = readExistingCatalog(siteRoot);
  const validation = validateCollection(records, existingCatalog, { expectedToolsPerBatch, similarityThreshold });
  const rendered = buildVirtualFiles({ records, validRecords: validation.validRecords, existingCatalog, siteRoot, updated });
  const outputIssues = validateGeneratedOutput(rendered.files, siteRoot);
  const issues = [...validation.issues, ...outputIssues];
  const report = {
    ok: issues.length === 0,
    generatedAt: new Date().toISOString(),
    configuration: { batchDir, siteRoot, outputRoot, expectedToolsPerBatch, similarityThreshold, updated },
    discoveredBatchFiles: records.length,
    acceptedBatches: validation.validRecords.map(record => record.data.batch),
    rejectedBatches: [...validation.batchIssues.keys()],
    existingToolPagesPreserved: existingCatalog.length,
    generatedToolPages: rendered.validCandidates.length,
    generatedAudienceHubs: rendered.batchModels.length,
    sitemapUrlCount: rendered.sitemapUrls.length,
    issues
  };
  rendered.files.set('email-tools/build-report.json', `${JSON.stringify(report, null, 2)}\n`);

  if (options.write && outputRoot) {
    prunePreviousGenerated(outputRoot, readPreviousManifest(outputRoot), new Set(rendered.files.keys()));
    writeVirtualFiles(rendered.files, outputRoot);
  }
  return { ...report, files: rendered.files, manifest: rendered.manifest, records, existingCatalog };
}

module.exports = {
  buildEmailTools,
  buildVirtualFiles,
  ensureWithin,
  loadBatchRecords,
  readPreviousManifest,
  readSitemapUrls,
  prunePreviousGenerated,
  relatedFor,
  renderSitemap,
  stableHash,
  walkJsonFiles,
  writeVirtualFiles
};
