'use strict';

const fs = require('fs');
const path = require('path');

const TOOL_KEYS = [
  'slug', 'name', 'keyword', 'intent', 'audience', 'outcome',
  'metaDescription', 'h1', 'intro', 'fields', 'subjectTemplate',
  'bodyTemplate', 'guidance', 'pitfalls', 'examples', 'faqs', 'relatedTags'
];
const FIELD_KEYS = ['key', 'label', 'type', 'placeholder', 'required'];
const ALLOWED_FIELD_TYPES = new Set(['text', 'textarea', 'email', 'date', 'time', 'number']);

function issue(code, message, context = {}) {
  return { severity: 'error', code, message, ...context };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalized(value) {
  return text(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function placeholders(value) {
  const found = [];
  const source = typeof value === 'string' ? value : '';
  for (const match of source.matchAll(/{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g)) found.push(match[1]);
  return found;
}

function wordCount(value) {
  const valueText = normalized(value);
  return valueText ? valueText.split(' ').length : 0;
}

function shingleSet(value, size = 3) {
  const words = normalized(value).split(' ').filter(Boolean);
  const output = new Set();
  if (words.length < size) {
    if (words.length) output.add(words.join(' '));
    return output;
  }
  for (let index = 0; index <= words.length - size; index += 1) {
    output.add(words.slice(index, index + size).join(' '));
  }
  return output;
}

function jaccard(left, right) {
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function similarityText(tool) {
  const examples = Array.isArray(tool.examples)
    ? tool.examples.map(item => `${text(item.label)} ${text(item.input)} ${text(item.output)}`).join(' ')
    : '';
  const faqs = Array.isArray(tool.faqs)
    ? tool.faqs.map(item => `${text(item.q)} ${text(item.a)}`).join(' ')
    : '';
  return [
    tool.outcome, tool.intro, tool.bodyTemplate,
    ...(Array.isArray(tool.guidance) ? tool.guidance : []),
    ...(Array.isArray(tool.pitfalls) ? tool.pitfalls : []),
    examples, faqs
  ].map(text).join(' ');
}

function validateString(tool, key, options, context, issues) {
  const value = text(tool[key]);
  if (!value) {
    issues.push(issue('schema.required_string', `${key} must be a non-empty string.`, { ...context, field: key }));
    return;
  }
  if (options.min && value.length < options.min) {
    issues.push(issue('content.too_short', `${key} must be at least ${options.min} characters.`, { ...context, field: key }));
  }
  if (options.max && value.length > options.max) {
    issues.push(issue('content.too_long', `${key} must be at most ${options.max} characters.`, { ...context, field: key }));
  }
}

function validateTool(tool, context) {
  const issues = [];
  if (!isObject(tool)) return [issue('schema.tool_object', 'Each tool must be an object.', context)];

  for (const key of TOOL_KEYS) {
    if (!(key in tool)) issues.push(issue('schema.missing_key', `Missing required tool key: ${key}.`, { ...context, field: key }));
  }
  for (const key of Object.keys(tool)) {
    if (!TOOL_KEYS.includes(key)) issues.push(issue('schema.unknown_key', `Unknown tool key: ${key}.`, { ...context, field: key }));
  }

  validateString(tool, 'slug', { min: 5, max: 80 }, context, issues);
  if (text(tool.slug) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) {
    issues.push(issue('schema.slug_format', 'slug must contain lowercase letters, numbers, and single hyphens only.', { ...context, field: 'slug' }));
  }
  validateString(tool, 'name', { min: 12, max: 90 }, context, issues);
  validateString(tool, 'keyword', { min: 8, max: 90 }, context, issues);
  validateString(tool, 'intent', { min: 3, max: 50 }, context, issues);
  validateString(tool, 'audience', { min: 3, max: 100 }, context, issues);
  validateString(tool, 'outcome', { min: 55, max: 240 }, context, issues);
  validateString(tool, 'metaDescription', { min: 80, max: 160 }, context, issues);
  validateString(tool, 'h1', { min: 20, max: 110 }, context, issues);
  validateString(tool, 'intro', { min: 120, max: 700 }, context, issues);
  validateString(tool, 'subjectTemplate', { min: 4, max: 180 }, context, issues);
  validateString(tool, 'bodyTemplate', { min: 90, max: 2400 }, context, issues);

  const fields = Array.isArray(tool.fields) ? tool.fields : [];
  if (!Array.isArray(tool.fields)) {
    issues.push(issue('schema.fields_array', 'fields must be an array.', { ...context, field: 'fields' }));
  } else if (fields.length < 3 || fields.length > 6) {
    issues.push(issue('schema.field_count', 'Each tool must declare between 3 and 6 fields.', { ...context, field: 'fields' }));
  }

  const fieldKeys = new Set();
  fields.forEach((field, fieldIndex) => {
    const fieldContext = { ...context, field: `fields[${fieldIndex}]` };
    if (!isObject(field)) {
      issues.push(issue('schema.field_object', 'Each field must be an object.', fieldContext));
      return;
    }
    for (const key of FIELD_KEYS) {
      if (!(key in field)) issues.push(issue('schema.field_missing_key', `Missing field key: ${key}.`, { ...fieldContext, field: `${fieldContext.field}.${key}` }));
    }
    for (const key of Object.keys(field)) {
      if (!FIELD_KEYS.includes(key)) issues.push(issue('schema.field_unknown_key', `Unknown field key: ${key}.`, { ...fieldContext, field: `${fieldContext.field}.${key}` }));
    }
    const key = text(field.key);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
      issues.push(issue('schema.field_key_format', 'Field keys must be JavaScript-style identifiers.', { ...fieldContext, field: `${fieldContext.field}.key` }));
    } else if (fieldKeys.has(key)) {
      issues.push(issue('duplicate.field_key', `Duplicate field key: ${key}.`, { ...fieldContext, field: `${fieldContext.field}.key` }));
    } else fieldKeys.add(key);
    if (text(field.label).length < 3) issues.push(issue('content.field_label', 'Field labels must be descriptive.', { ...fieldContext, field: `${fieldContext.field}.label` }));
    if (!ALLOWED_FIELD_TYPES.has(text(field.type))) issues.push(issue('schema.field_type', `Unsupported field type: ${text(field.type) || '(empty)'}.`, { ...fieldContext, field: `${fieldContext.field}.type` }));
    if (text(field.placeholder).length < 3) issues.push(issue('content.field_placeholder', 'Field placeholders must show a realistic input.', { ...fieldContext, field: `${fieldContext.field}.placeholder` }));
    if (typeof field.required !== 'boolean') issues.push(issue('schema.field_required', 'field.required must be boolean.', { ...fieldContext, field: `${fieldContext.field}.required` }));
  });

  const templateText = `${text(tool.subjectTemplate)}\n${text(tool.bodyTemplate)}`;
  const usedPlaceholders = placeholders(templateText);
  const bodyPlaceholders = new Set(placeholders(tool.bodyTemplate));
  if (bodyPlaceholders.size < 2) {
    issues.push(issue('template.minimum_placeholders', 'bodyTemplate must reference at least two distinct declared fields.', { ...context, field: 'bodyTemplate' }));
  }
  for (const placeholder of usedPlaceholders) {
    if (!fieldKeys.has(placeholder)) issues.push(issue('template.unknown_placeholder', `Template placeholder {{${placeholder}}} has no declared field.`, { ...context, field: 'bodyTemplate' }));
  }
  for (const key of fieldKeys) {
    if (!usedPlaceholders.includes(key)) issues.push(issue('template.unused_field', `Declared field ${key} is not referenced by either template.`, { ...context, field: 'fields' }));
  }
  const templateWithoutPlaceholders = templateText.replace(/{{\s*[A-Za-z][A-Za-z0-9_]*\s*}}/g, '');
  if (/[{}]/.test(templateWithoutPlaceholders)) {
    issues.push(issue('template.stray_brace', 'Templates contain a single unmatched brace; use {{fieldKey}} placeholders.', { ...context, field: 'bodyTemplate' }));
  }

  const listRules = [
    ['guidance', 3, 35],
    ['pitfalls', 2, 25]
  ];
  for (const [key, minimum, itemMinimum] of listRules) {
    const values = tool[key];
    if (!Array.isArray(values) || values.length < minimum) {
      issues.push(issue(`schema.${key}_count`, `${key} must contain at least ${minimum} entries.`, { ...context, field: key }));
      continue;
    }
    values.forEach((value, index) => {
      if (text(value).length < itemMinimum) issues.push(issue('content.list_item_thin', `${key}[${index}] must be at least ${itemMinimum} characters.`, { ...context, field: `${key}[${index}]` }));
    });
    const unique = new Set(values.map(normalized));
    if (unique.size !== values.length) issues.push(issue(`duplicate.${key}`, `${key} contains duplicate entries.`, { ...context, field: key }));
  }

  if (!Array.isArray(tool.examples) || tool.examples.length < 2) {
    issues.push(issue('schema.examples_count', 'examples must contain at least two scenarios.', { ...context, field: 'examples' }));
  } else {
    tool.examples.forEach((example, index) => {
      const base = `${context.tool || 'tool'}.examples[${index}]`;
      if (!isObject(example)) {
        issues.push(issue('schema.example_object', 'Each example must be an object.', { ...context, field: base }));
        return;
      }
      if (text(example.label).length < 4) issues.push(issue('content.example_label', 'Example labels must be descriptive.', { ...context, field: `${base}.label` }));
      if (text(example.input).length < 15) issues.push(issue('content.example_input', 'Example inputs must contain realistic context.', { ...context, field: `${base}.input` }));
      if (text(example.output).length < 70) issues.push(issue('content.example_output', 'Example outputs must be complete and useful.', { ...context, field: `${base}.output` }));
    });
  }

  if (!Array.isArray(tool.faqs) || tool.faqs.length < 2) {
    issues.push(issue('schema.faq_count', 'faqs must contain at least two questions.', { ...context, field: 'faqs' }));
  } else {
    tool.faqs.forEach((faq, index) => {
      const base = `${context.tool || 'tool'}.faqs[${index}]`;
      if (!isObject(faq)) {
        issues.push(issue('schema.faq_object', 'Each FAQ must be an object.', { ...context, field: base }));
        return;
      }
      if (text(faq.q).length < 18 || !text(faq.q).endsWith('?')) issues.push(issue('content.faq_question', 'FAQ questions must be specific questions ending in a question mark.', { ...context, field: `${base}.q` }));
      if (text(faq.a).length < 45) issues.push(issue('content.faq_answer', 'FAQ answers must be direct and substantive.', { ...context, field: `${base}.a` }));
    });
  }

  if (!Array.isArray(tool.relatedTags) || tool.relatedTags.length < 2 || tool.relatedTags.length > 8) {
    issues.push(issue('schema.related_tags', 'relatedTags must contain between 2 and 8 tags.', { ...context, field: 'relatedTags' }));
  } else {
    const tags = tool.relatedTags.map(normalized).filter(Boolean);
    if (tags.length !== tool.relatedTags.length || new Set(tags).size !== tags.length) issues.push(issue('duplicate.related_tags', 'relatedTags must be non-empty and unique.', { ...context, field: 'relatedTags' }));
  }

  const contentWords = wordCount(similarityText(tool));
  if (contentWords < 170) issues.push(issue('content.thin_tool', `Tool content has only ${contentWords} words; minimum is 170.`, context));
  return issues;
}

function readExistingCatalog(siteRoot) {
  const toolsRoot = path.join(siteRoot, 'email-tools');
  if (!fs.existsSync(toolsRoot)) return [];
  const ignored = new Set(['assets', 'data', 'audiences', 'de']);
  const catalog = [];
  for (const entry of fs.readdirSync(toolsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignored.has(entry.name)) continue;
    const file = path.join(toolsRoot, entry.name, 'index.html');
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const match = pattern => (html.match(pattern) || [])[1] || '';
    const strip = value => value.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    catalog.push({
      slug: entry.name,
      name: strip(match(/<title>([\s\S]*?)<\/title>/i).replace(/\s*\|\s*ReplyMind\s*$/i, '')),
      title: strip(match(/<title>([\s\S]*?)<\/title>/i)),
      h1: strip(match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)),
      metaDescription: strip(match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)),
      url: `https://www.replymind.xyz/email-tools/${entry.name}/`,
      content: strip(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')),
      existing: true
    });
  }
  return catalog;
}

function validateCollection(batchRecords, existingCatalog, options = {}) {
  const expectedToolsPerBatch = Number.isInteger(options.expectedToolsPerBatch) ? options.expectedToolsPerBatch : 50;
  const similarityThreshold = typeof options.similarityThreshold === 'number' ? options.similarityThreshold : 0.72;
  const issues = [];
  const batchIssues = new Map();
  const add = (batch, value) => {
    issues.push(value);
    if (batch) {
      if (!batchIssues.has(batch)) batchIssues.set(batch, []);
      batchIssues.get(batch).push(value);
    }
  };

  const candidates = [];
  const seenBatches = new Map();
  for (const record of batchRecords) {
    const batchName = text(record.data && record.data.batch) || record.file;
    record.batchName = batchName;
    if (record.parseError) {
      add(batchName, issue('json.invalid', record.parseError, { file: record.file, batch: batchName }));
      continue;
    }
    const data = record.data;
    if (!isObject(data)) {
      add(batchName, issue('schema.batch_object', 'Batch file root must be an object.', { file: record.file, batch: batchName }));
      continue;
    }
    for (const key of ['batch', 'avatar', 'tools']) {
      if (!(key in data)) add(batchName, issue('schema.batch_missing_key', `Missing batch key: ${key}.`, { file: record.file, batch: batchName, field: key }));
    }
    for (const key of Object.keys(data)) {
      if (!['batch', 'avatar', 'tools'].includes(key)) add(batchName, issue('schema.batch_unknown_key', `Unknown batch key: ${key}.`, { file: record.file, batch: batchName, field: key }));
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text(data.batch))) add(batchName, issue('schema.batch_slug', 'batch must be a lowercase hyphenated slug.', { file: record.file, batch: batchName, field: 'batch' }));
    if (text(data.batch) && path.basename(record.file, '.json') !== text(data.batch)) add(batchName, issue('schema.batch_filename', `Filename must be ${text(data.batch)}.json.`, { file: record.file, batch: batchName, field: 'batch' }));
    if (seenBatches.has(text(data.batch))) {
      const previous = seenBatches.get(text(data.batch));
      add(batchName, issue('duplicate.batch', `Batch identifier duplicates ${previous.file}.`, { file: record.file, batch: batchName, field: 'batch' }));
      add(previous.batchName, issue('duplicate.batch', `Batch identifier duplicates ${record.file}.`, { file: previous.file, batch: previous.batchName, field: 'batch' }));
    } else if (text(data.batch)) seenBatches.set(text(data.batch), record);
    if (text(data.avatar).length < 12 || text(data.avatar).length > 70) add(batchName, issue('content.avatar', 'avatar must clearly identify the audience in 12 to 70 characters.', { file: record.file, batch: batchName, field: 'avatar' }));
    if (!Array.isArray(data.tools)) {
      add(batchName, issue('schema.tools_array', 'tools must be an array.', { file: record.file, batch: batchName, field: 'tools' }));
      continue;
    }
    if (data.tools.length !== expectedToolsPerBatch) {
      add(batchName, issue('schema.exact_tool_count', `Batch must contain exactly ${expectedToolsPerBatch} tools; found ${data.tools.length}.`, { file: record.file, batch: batchName, field: 'tools' }));
    }
    data.tools.forEach((tool, index) => {
      const toolContext = { file: record.file, batch: batchName, tool: text(tool && tool.slug) || `tools[${index}]`, toolIndex: index };
      for (const value of validateTool(tool, toolContext)) add(batchName, value);
      if (isObject(tool)) candidates.push({ record, batch: batchName, tool, index, context: toolContext });
    });
  }

  const identityFields = [
    ['slug', value => text(value)],
    ['name', normalized],
    ['keyword', normalized],
    ['h1', normalized],
    ['metaDescription', normalized]
  ];
  for (const [field, canonicalize] of identityFields) {
    const seen = new Map();
    for (const existing of existingCatalog) {
      const key = canonicalize(existing[field] || (field === 'name' ? existing.title : ''));
      if (key) seen.set(key, { existing });
    }
    for (const candidate of candidates) {
      const key = canonicalize(candidate.tool[field]);
      if (!key) continue;
      if (seen.has(key)) {
        const previous = seen.get(key);
        const message = previous.existing
          ? `${field} duplicates existing page ${previous.existing.slug}.`
          : `${field} duplicates ${previous.candidate.tool.slug} in batch ${previous.candidate.batch}.`;
        add(candidate.batch, issue(`duplicate.${field}`, message, { ...candidate.context, field }));
        if (previous.candidate) add(previous.candidate.batch, issue(`duplicate.${field}`, `${field} duplicates ${candidate.tool.slug} in batch ${candidate.batch}.`, { ...previous.candidate.context, field }));
      } else seen.set(key, { candidate });
    }
  }

  const similarityCandidates = candidates.map(candidate => ({
    ...candidate,
    shingles: shingleSet(similarityText(candidate.tool), 3),
    bodyShingles: shingleSet(candidate.tool.bodyTemplate, 2)
  }));
  for (let leftIndex = 0; leftIndex < similarityCandidates.length; leftIndex += 1) {
    const left = similarityCandidates[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < similarityCandidates.length; rightIndex += 1) {
      const right = similarityCandidates[rightIndex];
      const score = jaccard(left.shingles, right.shingles);
      const bodyScore = jaccard(left.bodyShingles, right.bodyShingles);
      if (score >= similarityThreshold || bodyScore >= 0.86) {
        const message = `High text similarity with ${right.tool.slug}: content=${score.toFixed(3)}, body=${bodyScore.toFixed(3)}.`;
        add(left.batch, issue('similarity.high_pairwise', message, left.context));
        add(right.batch, issue('similarity.high_pairwise', `High text similarity with ${left.tool.slug}: content=${score.toFixed(3)}, body=${bodyScore.toFixed(3)}.`, right.context));
      }
    }
  }

  const existingWithShingles = existingCatalog.map(existing => ({ ...existing, shingles: shingleSet(existing.content, 3) }));
  for (const candidate of similarityCandidates) {
    for (const existing of existingWithShingles) {
      const score = jaccard(candidate.shingles, existing.shingles);
      if (score >= similarityThreshold) {
        add(candidate.batch, issue('similarity.existing_page', `Content similarity ${score.toFixed(3)} is too high against existing page ${existing.slug}.`, candidate.context));
      }
    }
  }

  const validRecords = batchRecords.filter(record => record.data && !batchIssues.has(record.batchName));
  return { issues, batchIssues, validRecords, candidates, expectedToolsPerBatch, similarityThreshold };
}

module.exports = {
  issue,
  isObject,
  jaccard,
  normalized,
  placeholders,
  readExistingCatalog,
  shingleSet,
  similarityText,
  text,
  validateCollection,
  validateTool,
  wordCount
};
