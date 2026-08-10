# ReplyMind claim ledger

Only claims with local evidence are allowed in production copy.

| Claim | Evidence | Status |
|---|---|---|
| ReplyMind drafts inside Gmail | `ReplyMind-v2.0.3-Chrome-Web-Store/content/gmail.js` and `store-assets/screenshot-2-in-gmail.png` | VERIFIED |
| ReplyMind supports LinkedIn messaging | `manifest.json`, `content/linkedin.js`, and `store-assets/screenshot-4-gmail-linkedin.png` | VERIFIED |
| The person chooses an intent before generation | `content/gmail.js` intent picker and `popup/popup.html` | VERIFIED |
| Voice samples are analyzed in the browser | `onboarding/voice.js` | VERIFIED |
| Contact notes are stored locally | `background/service-worker.js`, `popup/popup.js`, and `privacy.html` | VERIFIED |
| Follow-up reminders use browser alarms | `background/service-worker.js` | VERIFIED |
| ReplyMind does not autonomously send | `content/gmail.js` inserts/copies a draft; send remains Gmail's action | VERIFIED |
| Free plan includes 15 replies and five core intents | `content/gmail.js` and `background/service-worker.js` plan limits | VERIFIED |
| Pro price is $19/month or $180/year | Existing `checkout.html` Paddle price catalog | VERIFIED |
| Paddle handles checkout | Existing `checkout.html` Paddle.js integration | VERIFIED |
| 14-day refund policy | Existing `refund.html` and checkout copy | VERIFIED |
| Generated drafts are never perfect | Product-safe editorial framing, not a factual product claim | SAFE FRAMING |
| Faster replies, higher revenue, guaranteed outcomes, or customer results | No local evidence supplied | NEEDS_VERIFICATION — excluded |
| Testimonials, ratings, usage counters, scarcity, or research results | No evidence supplied | NEEDS_VERIFICATION — excluded |
