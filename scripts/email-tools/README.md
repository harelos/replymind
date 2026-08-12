# ReplyMind email-tool factory

`scripts/generate-email-tools-batches.js` validates specialist JSON and renders accepted batches into a staging directory. It never edits batch JSON and does not deploy.

Production defaults are strict:

- exactly 50 tools per batch;
- batch-atomic rejection when any tool or batch rule fails;
- collisions checked against the existing 20 tool pages;
- unique slugs, names/titles, keywords, H1s, and metadata;
- declared-field/template-placeholder consistency;
- minimum useful-content thresholds;
- pairwise three-word-shingle similarity checks;
- generated HTML checks for links, canonical metadata, JSON-LD, functional configuration, related tools, and UTM-tagged Chrome Store CTAs.

Validate without writing:

```powershell
node scripts/generate-email-tools-batches.js --dry-run --json
```

Build into a disposable staging directory:

```powershell
node scripts/generate-email-tools-batches.js --output-root .tmp/email-tools-stage
```

Fixture tests use `--expected-tools 2`; production must keep the default of 50. Publication and deployment are deliberately separate operations.
