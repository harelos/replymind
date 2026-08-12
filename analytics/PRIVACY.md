# Privacy, consent, and retention

- Analytics is opt-in. `tracker.js` sends nothing unless `replymind_analytics_consent=granted` exists in local storage. Essential payment events come only from verified server webhooks.
- Never send email content, generated replies, names, email addresses, IP addresses, full URLs with query strings, payment method details, or provider payloads. Metadata is restricted to small scalar values.
- Visitor and session IDs are random pseudonymous identifiers. Do not join them to extension/account identity without a separately documented lawful basis and consent.
- Default raw-event retention is 400 days. Run the documented scheduled deletion query; aggregate financial records may be retained longer where law requires. Fulfil deletion requests by pseudonymous visitor ID.
- UTM source/campaign/medium are stored only after consent. Cross-property identity is not supported.
- Access to the dashboard and write APIs is least-privilege; rotate the admin token and all webhook secrets on suspected exposure. Logs must never contain request bodies, authorization headers, or secrets.

Retention query (schedule daily after deployment):

```sql
DELETE FROM events WHERE occurred_at < datetime('now', '-' || ? || ' days');
```
