#!/usr/bin/env node
'use strict';

const path = require('path');
const { buildEmailTools } = require('./email-tools/factory');

function parseArguments(argv) {
  const args = {
    siteRoot: path.resolve(__dirname, '..'),
    batchDir: path.resolve(__dirname, '..', 'email-tools', 'data', 'batches'),
    outputRoot: null,
    expectedToolsPerBatch: 50,
    similarityThreshold: 0.72,
    updated: new Date().toISOString().slice(0, 10),
    write: false,
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => {
      if (index + 1 >= argv.length) throw new Error(`Missing value for ${token}`);
      index += 1;
      return argv[index];
    };
    if (token === '--site-root') args.siteRoot = path.resolve(next());
    else if (token === '--batch-dir') args.batchDir = path.resolve(next());
    else if (token === '--output-root') { args.outputRoot = path.resolve(next()); args.write = true; }
    else if (token === '--expected-tools') args.expectedToolsPerBatch = Number.parseInt(next(), 10);
    else if (token === '--similarity-threshold') args.similarityThreshold = Number.parseFloat(next());
    else if (token === '--updated') args.updated = next();
    else if (token === '--dry-run') args.write = false;
    else if (token === '--json') args.json = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!Number.isInteger(args.expectedToolsPerBatch) || args.expectedToolsPerBatch < 1) throw new Error('--expected-tools must be a positive integer.');
  if (!Number.isFinite(args.similarityThreshold) || args.similarityThreshold <= 0 || args.similarityThreshold > 1) throw new Error('--similarity-threshold must be greater than 0 and at most 1.');
  return args;
}

function help() {
  return `ReplyMind batch static-page factory

Usage:
  node scripts/generate-email-tools-batches.js [options]

Options:
  --batch-dir <path>            JSON batch directory (recursive)
  --site-root <path>            Existing ReplyMind site root used for collision/link checks
  --output-root <path>          Write staged output here; omitted means validation-only
  --expected-tools <number>     Exact tools required per batch (default: 50)
  --similarity-threshold <0-1>  Pairwise 3-word-shingle threshold (default: 0.72)
  --updated <YYYY-MM-DD>        Sitemap lastmod date
  --dry-run                     Validate/render in memory without writing
  --json                        Print the complete report as JSON
  --help                        Show this help

The command never edits source batch files. Use a staging output root first; deployment is separate.
`;
}

function main() {
  let args;
  try { args = parseArguments(process.argv.slice(2)); }
  catch (error) { console.error(error.message); console.error(help()); process.exitCode = 2; return; }
  if (args.help) { console.log(help()); return; }
  const report = buildEmailTools(args);
  if (args.json) {
    const printable = { ...report };
    delete printable.files;
    delete printable.records;
    delete printable.existingCatalog;
    delete printable.manifest;
    console.log(JSON.stringify(printable, null, 2));
  } else {
    console.log(`Batch files: ${report.discoveredBatchFiles}`);
    console.log(`Accepted batches: ${report.acceptedBatches.length}`);
    console.log(`Rejected batches: ${report.rejectedBatches.length}`);
    console.log(`Existing pages preserved: ${report.existingToolPagesPreserved}`);
    console.log(`Generated tools: ${report.generatedToolPages}`);
    console.log(`Generated audience hubs: ${report.generatedAudienceHubs}`);
    console.log(`Validation issues: ${report.issues.length}`);
    if (args.write && args.outputRoot) console.log(`Staged output: ${args.outputRoot}`);
    for (const value of report.issues.slice(0, 30)) {
      console.error(`[${value.code}] ${value.file || '(generated)'}${value.tool ? ` :: ${value.tool}` : ''}: ${value.message}`);
    }
    if (report.issues.length > 30) console.error(`... ${report.issues.length - 30} additional issues are recorded in email-tools/build-report.json.`);
  }
  if (!report.ok) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { help, main, parseArguments };
