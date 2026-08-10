# ReplyMind funnel event instrumentation map

Events are first-party, content-free, and queued only after analytics consent. No message text, generated reply, recipient, contact name, or note is recorded.

| Event | Trigger | Allowed properties |
|---|---|---|
| `advertorial_view` | First visible load of either advertorial | `page`, `route` |
| `advertorial_cta_clicked` | Advertorial CTA click | `destination`, `label` |
| `sales_view` | First visible load of either sales page | `page`, `route` |
| `sales_cta_clicked` | Sales CTA click | `destination`, `label` |
| `quiz_started` | Reserved for a future quiz surface | `page` |
| `quiz_step_completed` | Reserved for a future quiz surface | `step` |
| `quiz_completed` | Reserved for a future quiz surface | `result_type` |
| `play_handoff_clicked` | Reserved for Dopamodoro only | `destination` |
| `checkout_started` | Visitor opens Paddle checkout | `billing`, `checkout_style` |
| `plan_selected` | Monthly/annual selection | `billing` |
| `purchase_completed` | Paddle `checkout.completed` callback | `billing` |
| `purchase_failed` | Paddle checkout error callback | `billing`, `error_type` |

Experiment assignment is stored for routing and analytics only. It is never rendered in visitor copy.
