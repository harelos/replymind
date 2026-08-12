'use strict';

const fs = require('fs');
const path = require('path');
const { issue, normalized } = require('./validation');
const { BASE_URL } = require('./render');

function matches(html, pattern) {
  return [...html.matchAll(pattern)].map(match => match[1]);
}

function first(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].trim() : '';
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function pathForHref(sourcePath, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  let resolved;
  if (clean.startsWith('/')) resolved = clean.slice(1);
  else resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), clean));
  if (!path.posix.extname(resolved) || resolved.endsWith('/')) resolved = path.posix.join(resolved, 'index.html');
  return resolved.replace(/^\.\//, '');
}

function virtualExists(relativePath, files, siteRoot) {
  if (files.has(relativePath)) return true;
  return fs.existsSync(path.join(siteRoot, ...relativePath.split('/')));
}

function expectedCanonical(relativePath) {
  if (relativePath === 'index.html') return `${BASE_URL}/`;
  if (relativePath.endsWith('/index.html')) return `${BASE_URL}/${relativePath.slice(0, -'index.html'.length)}`;
  return `${BASE_URL}/${relativePath}`;
}

function graphNodes(schema) {
  if (schema && Array.isArray(schema['@graph'])) return schema['@graph'];
  return schema ? [schema] : [];
}

function validateGeneratedOutput(files, siteRoot) {
  const issues = [];
  const seen = { title: new Map(), meta: new Map(), h1: new Map(), canonical: new Map() };

  for (const [relativePath, content] of files) {
    if (!relativePath.endsWith('.html')) continue;
    const context = { file: relativePath };
    const title = stripTags(first(content, /<title>([\s\S]*?)<\/title>/i));
    const meta = first(content, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const canonical = first(content, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    const h1Values = matches(content, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(stripTags);
    const scalarChecks = [
      ['title', title], ['meta', meta], ['canonical', canonical], ['h1', h1Values[0] || '']
    ];
    for (const [kind, value] of scalarChecks) {
      if (!value) {
        issues.push(issue(`output.missing_${kind}`, `Generated HTML is missing ${kind}.`, context));
        continue;
      }
      const key = normalized(value);
      if (seen[kind].has(key)) issues.push(issue(`output.duplicate_${kind}`, `${kind} duplicates ${seen[kind].get(key)}.`, context));
      else seen[kind].set(key, relativePath);
    }
    if (h1Values.length !== 1) issues.push(issue('output.h1_count', `Expected exactly one H1; found ${h1Values.length}.`, context));
    if (canonical && canonical !== expectedCanonical(relativePath)) {
      issues.push(issue('output.canonical_mismatch', `Canonical ${canonical} does not match ${expectedCanonical(relativePath)}.`, context));
    }

    const jsonLdBlocks = matches(content, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!jsonLdBlocks.length) issues.push(issue('output.jsonld_missing', 'Generated page has no JSON-LD.', context));
    let nodes = [];
    for (const block of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(block);
        nodes = nodes.concat(graphNodes(parsed));
      } catch (error) {
        issues.push(issue('output.jsonld_invalid', `Invalid JSON-LD: ${error.message}`, context));
      }
    }
    const types = new Set(nodes.map(node => node && node['@type']).filter(Boolean));
    if (!types.has('BreadcrumbList')) issues.push(issue('output.breadcrumb_jsonld', 'Generated page must contain BreadcrumbList JSON-LD.', context));
    if (content.includes('data-generated-tool=') && !types.has('WebApplication')) issues.push(issue('output.webapplication_jsonld', 'Generated tool page must contain WebApplication JSON-LD.', context));
    if (content.includes('data-generated-audience=') && !types.has('CollectionPage')) issues.push(issue('output.collection_jsonld', 'Generated audience hub must contain CollectionPage JSON-LD.', context));
    for (const node of nodes) {
      if (node && node['@type'] === 'WebApplication' && node.url !== canonical) issues.push(issue('output.jsonld_url', 'WebApplication URL must equal the canonical URL.', context));
    }

    const hrefs = matches(content, /\shref=["']([^"']+)["']/gi);
    for (const href of hrefs) {
      if (/^(?:https?:|mailto:|tel:|javascript:)/i.test(href) || href.startsWith('#')) continue;
      const target = pathForHref(relativePath, href);
      if (target && !virtualExists(target, files, siteRoot)) issues.push(issue('output.broken_link', `Broken internal link ${href} resolves to ${target}.`, context));
    }

    const storeLinks = hrefs.filter(href => href.startsWith('https://chromewebstore.google.com/'));
    if (!storeLinks.length) issues.push(issue('output.missing_store_cta', 'Generated page must include a Chrome Web Store CTA.', context));
    for (const href of storeLinks) {
      try {
        const url = new URL(href);
        for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
          if (!url.searchParams.get(key)) issues.push(issue('output.cta_utm', `Chrome Web Store CTA is missing ${key}.`, context));
        }
      } catch (error) {
        issues.push(issue('output.cta_url', `Invalid Chrome Web Store CTA URL: ${error.message}`, context));
      }
    }

    if (content.includes('data-generated-tool=')) {
      const relatedLinks = hrefs.filter(href => /^\/email-tools\/[a-z0-9-]+\/$/.test(href));
      if (new Set(relatedLinks).size < 3) issues.push(issue('output.related_links', 'Generated tool pages need at least three distinct related-tool links.', context));
      const configText = first(content, /<script[^>]+data-tool-config[^>]*>([\s\S]*?)<\/script>/i);
      try {
        const config = JSON.parse(configText);
        if (!Array.isArray(config.fields) || !config.subjectTemplate || !config.bodyTemplate) throw new Error('Missing fields or templates');
      } catch (error) {
        issues.push(issue('output.tool_config', `Invalid functional tool configuration: ${error.message}`, context));
      }
    }
  }
  return issues;
}

module.exports = { expectedCanonical, pathForHref, validateGeneratedOutput, virtualExists };
