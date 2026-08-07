# ReplyMind 500 Tool Batch Contract

Each specialist owns one file in `email-tools/data/batches/<batch>.json` and no other files.
The file must be valid UTF-8 JSON with this shape:

```json
{
  "batch": "sales-business-development",
  "avatar": "Sales and business development professionals",
  "tools": [
    {
      "slug": "post-demo-follow-up-email-builder",
      "name": "Post-Demo Follow-Up Email Builder",
      "keyword": "post demo follow up email",
      "intent": "follow-up",
      "audience": "Account executives",
      "outcome": "Turn a completed demo into a clear next step without sounding pushy.",
      "metaDescription": "Build a concise post-demo follow-up with decisions, open questions, owners, and a next step. Free private email tool by ReplyMind.",
      "h1": "Write the follow-up that moves a good demo forward.",
      "intro": "Two or three specific sentences explaining the real communication problem and what this tool helps the visitor complete.",
      "fields": [
        {"key": "recipient", "label": "Recipient name", "type": "text", "placeholder": "Jordan", "required": false},
        {"key": "decision", "label": "What was agreed", "type": "textarea", "placeholder": "The team wants a security review", "required": true},
        {"key": "nextStep", "label": "Requested next step", "type": "textarea", "placeholder": "Choose a review time", "required": true}
      ],
      "subjectTemplate": "Next steps after our demo",
      "bodyTemplate": "Hi {{recipient}},\n\nThanks for the thoughtful demo conversation. We agreed that {{decision}}. The clearest next step is {{nextStep}}.\n\nBest,",
      "guidance": ["Three specific, non-generic tips for this exact situation."],
      "pitfalls": ["Two specific mistakes to avoid."],
      "examples": [
        {"label": "One realistic scenario", "input": "Compact context", "output": "A complete useful example."},
        {"label": "A meaningfully different scenario", "input": "Compact context", "output": "A complete useful example."}
      ],
      "faqs": [
        {"q": "A real question for this job?", "a": "A direct, accurate answer."},
        {"q": "A second non-generic question?", "a": "A direct, accurate answer."}
      ],
      "relatedTags": ["sales", "follow-up", "demo"]
    }
  ]
}
```

## Non-Negotiable Quality Rules

- Exactly 50 tools, all useful to the assigned avatar and within ReplyMind's communication scope.
- Do not repeat or lightly rename any existing `email-tools` page.
- Every slug, name, keyword, H1, outcome, body template, examples, and FAQs must be distinct.
- Every tool must perform a real local task through 3-6 scenario-specific fields and a usable template.
- `bodyTemplate` must reference at least two declared field keys using `{{key}}` placeholders.
- No fabricated statistics, testimonials, rankings, legal/medical/financial advice, or unshipped ReplyMind features.
- Natural language only. Do not repeat an exact keyword unnaturally or create city/industry permutations.
- The page exists to solve the visitor's communication job. ReplyMind is the optional next step, not the substance of the page.
- Do not modify generators, HTML, CSS, sitemap, existing pages, Git state, or deployment.
- Validate JSON before reporting completion.

Google guidance for the integrator: automation is acceptable only when pages add genuine user value. Scaled pages whose main purpose is search manipulation must be rejected.
