import {
  validateEvent,
  assignVariant,
  type FunnelInput,
  type AnalyticsEvent,
} from "./contracts";
interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  ADMIN_TOKEN?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  DATA_RETENTION_DAYS: string;
  ATTRIBUTION_WINDOW_DAYS: string;
  ENVIRONMENT: string;
}
const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json;charset=utf-8", ...headers },
  });
const safeEq = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let n = 0;
  for (let i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return n === 0;
};
const cors = (req: Request, env: Env): Record<string, string> => {
  const o = req.headers.get("origin") || "";
  return env.ALLOWED_ORIGINS.split(",").includes(o)
    ? {
        "access-control-allow-origin": o,
        "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
        vary: "Origin",
      }
    : {};
};
const admin = (r: Request, e: Env) =>
  !!e.ADMIN_TOKEN &&
  safeEq(r.headers.get("authorization") || "", `Bearer ${e.ADMIN_TOKEN}`);
async function hmac(secret: string, payload: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        ),
        new TextEncoder().encode(payload),
      ),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function collect(req: Request, env: Env) {
  const raw = await req.json().catch(() => null),
    batch = Array.isArray(raw) ? raw : [raw];
  if (batch.length > 50) return json({ error: "maximum batch is 50" }, 413);
  const good: AnalyticsEvent[] = [];
  const errors: unknown[] = [];
  batch.forEach((x, i) => {
    const v = validateEvent(x);
    v.ok ? good.push(v.value) : errors.push({ index: i, errors: v.errors });
  });
  if (errors.length)
    return json({ error: "validation_failed", details: errors }, 400);
  const stmts = good.map((e) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO events(event_id,event_type,occurred_at,property_id,funnel_id,experiment_id,variant_id,step_id,previous_step_id,visitor_id,session_id,campaign,source,medium,consent,amount_minor,currency,external_id,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      e.event_id,
      e.event_type,
      e.occurred_at,
      e.property_id,
      e.funnel_id,
      e.experiment_id || null,
      e.variant_id || null,
      e.step_id || null,
      e.previous_step_id || null,
      e.visitor_id,
      e.session_id,
      e.campaign || null,
      e.source || null,
      e.medium || null,
      e.consent,
      e.amount_minor ?? null,
      e.currency || null,
      e.external_id || null,
      JSON.stringify(e.metadata || {}),
    ),
  );
  const out = await env.DB.batch(stmts);
  return json(
    {
      accepted: out.filter((x) => x.meta.changes > 0).length,
      duplicates: out.filter((x) => x.meta.changes === 0).length,
    },
    202,
  );
}
function filters(u: URL) {
  const from =
    u.searchParams.get("from") ||
    new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const to = u.searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const clauses = ["occurred_at>=?", "occurred_at<?"],
    binds: any[] = [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`];
  for (const k of [
    "property_id",
    "funnel_id",
    "campaign",
    "source",
    "variant_id",
  ]) {
    const v = u.searchParams.get(k);
    if (v) {
      clauses.push(`${k}=?`);
      binds.push(v);
    }
  }
  return { clauses, binds, from, to };
}
async function metrics(u: URL, env: Env) {
  const f = filters(u),
    where = f.clauses.join(" AND ");
  const rows = await env.DB.prepare(
    `SELECT
      COALESCE(variant_id,'unassigned') variant_id,
      COUNT(DISTINCT CASE WHEN event_type IN('visit','funnel_viewed','session_started') THEN session_id END) visits,
      COUNT(DISTINCT CASE WHEN event_type IN('visit','funnel_viewed','session_started') THEN visitor_id END) unique_visitors,
      COUNT(DISTINCT CASE WHEN event_type='variant_exposed' THEN visitor_id END) exposures,
      COUNT(DISTINCT CASE WHEN event_type IN('next_step','next_step_reached') THEN session_id END) transitions,
      COUNT(DISTINCT CASE WHEN event_type IN('step_view','step_viewed','advertorial_view') AND (step_id LIKE '%advertorial%' OR event_type='advertorial_view') THEN session_id END) advertorial,
      COUNT(DISTINCT CASE WHEN event_type IN('step_view','step_viewed','sales_view') AND (step_id LIKE '%sales%' OR event_type='sales_view') THEN session_id END) sales,
      COUNT(DISTINCT CASE WHEN event_type='quiz_started' THEN session_id END) quiz_starts,
      COUNT(DISTINCT CASE WHEN event_type='quiz_completed' THEN session_id END) quiz_completions,
      COUNT(DISTINCT CASE WHEN event_type='play_handoff_clicked' THEN session_id END) play_handoffs,
      COUNT(DISTINCT CASE WHEN event_type IN('checkout_start','checkout_started') THEN session_id END) checkout_starts,
      COUNT(DISTINCT CASE WHEN event_type IN('purchase','purchase_completed') AND provider IS NOT NULL THEN external_id WHEN event_type IN('purchase_confirmed') AND provider IS NOT NULL THEN external_id END) purchases,
      COUNT(DISTINCT CASE WHEN event_type IN('refund','refund_confirmed') AND provider IS NOT NULL THEN external_id END) refunds,
      COALESCE(SUM(CASE WHEN event_type IN('purchase','purchase_confirmed','purchase_completed','subscription_started','subscription_renewed') AND provider IS NOT NULL THEN amount_minor WHEN event_type IN('refund','refund_confirmed') AND provider IS NOT NULL THEN -amount_minor ELSE 0 END),0) revenue_minor,
      MAX(received_at) freshest_event_at
    FROM events WHERE ${where} GROUP BY variant_id`,
  )
    .bind(...f.binds)
    .all<any>();
  const cost = await env.DB.prepare(
    `SELECT COALESCE(SUM(cost_minor),0) cost_minor,MAX(fetched_at) freshest_cost_at FROM ad_costs WHERE day>=? AND day<=?`,
  )
    .bind(f.from, f.to)
    .first<any>();
  return json({
    range: { from: f.from, to: f.to },
    currency_note: "Group/report by currency before financial decisions",
    freshness: {
      events: rows.results?.[0]?.freshest_event_at || null,
      ad_costs: cost?.freshest_cost_at || null,
    },
    variants: (rows.results || []).map((r: any) => ({
      ...r,
      exposure_to_transition_pct: pct(r.transitions, r.exposures),
      quiz_completion_pct: pct(r.quiz_completions, r.quiz_starts),
      quiz_to_play_handoff_pct: pct(r.play_handoffs, r.quiz_completions),
      advertorial_to_sales_pct: pct(r.sales, r.advertorial),
      sales_to_checkout_pct: pct(r.checkout_starts, r.sales),
      checkout_to_purchase_pct: pct(r.purchases, r.checkout_starts),
      overall_conversion_pct: pct(r.purchases, r.unique_visitors),
      cac_minor: r.purchases
        ? Math.round((cost?.cost_minor || 0) / r.purchases)
        : null,
    })),
    caveats: [
      "Play handoff is a click, not an install, activation, or purchase conversion.",
      "Purchases, refunds, and revenue include verified provider events only.",
      "Ad cost freshness is independent of event freshness.",
      "Retention requires subscription renewal/cancellation events and cohort analysis.",
    ],
  });
}
const pct = (n: number, d: number) =>
  d ? Math.round((n / d) * 10000) / 100 : null;
async function saveFunnel(req: Request, env: Env) {
  const f = (await req.json()) as FunnelInput;
  if (!f.id || !f.property_id || !f.steps?.length)
    return json({ error: "invalid funnel" }, 400);
  const duplicate =
    new Set(f.steps.map((s) => s.position)).size !== f.steps.length;
  if (duplicate) return json({ error: "step positions must be unique" }, 400);
  const q = [
    env.DB.prepare(
      `INSERT INTO funnels(id,property_id,name,status,published_at) VALUES(?,?,?,?,CASE WHEN ?='published' THEN CURRENT_TIMESTAMP END) ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,version=version+1,updated_at=CURRENT_TIMESTAMP,published_at=CASE WHEN excluded.status='published' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END`,
    ).bind(f.id, f.property_id, f.name, f.status, f.status),
    env.DB.prepare("DELETE FROM funnel_steps WHERE funnel_id=?").bind(f.id),
    ...f.steps.map((s) =>
      env.DB.prepare(
        "INSERT INTO funnel_steps(id,funnel_id,name,position,kind,path) VALUES(?,?,?,?,?,?)",
      ).bind(s.id, f.id, s.name, s.position, s.kind, s.path),
    ),
  ];
  await env.DB.batch(q);
  return json({ id: f.id, status: f.status, stable_ids: true });
}
async function webhook(req: Request, env: Env, provider: "stripe" | "paddle") {
  const raw = await req.text();
  let ok = false;
  if (provider === "stripe" && env.STRIPE_WEBHOOK_SECRET) {
    const h = req.headers.get("stripe-signature") || "",
      parts = Object.fromEntries(h.split(",").map((x) => x.split("=")));
    if (
      parts.t &&
      parts.v1 &&
      Math.abs(Date.now() / 1000 - Number(parts.t)) <= 300
    )
      ok = safeEq(
        await hmac(env.STRIPE_WEBHOOK_SECRET, `${parts.t}.${raw}`),
        parts.v1,
      );
  }
  if (provider === "paddle" && env.PADDLE_WEBHOOK_SECRET) {
    const h = req.headers.get("paddle-signature") || "",
      parts = Object.fromEntries(h.split(";").map((x) => x.split("=")));
    if (
      parts.ts &&
      parts.h1 &&
      Math.abs(Date.now() / 1000 - Number(parts.ts)) <= 300
    )
      ok = safeEq(
        await hmac(env.PADDLE_WEBHOOK_SECRET, `${parts.ts}:${raw}`),
        parts.h1,
      );
  }
  if (!ok) return json({ error: "invalid_signature" }, 400);
  const x = JSON.parse(raw),
    mapped = mapPayment(provider, x);
  if (!mapped) return json({ ignored: true }, 200);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO events(event_id,event_type,occurred_at,property_id,funnel_id,visitor_id,session_id,consent,amount_minor,currency,external_id,metadata_json,provider) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      `${provider}:${x.id}`,
      mapped.type,
      x.created
        ? new Date(x.created * 1000).toISOString()
        : x.occurred_at || new Date().toISOString(),
      mapped.property,
      mapped.funnel,
      "payment-provider",
      "payment-provider",
      "essential",
      mapped.amount,
      mapped.currency,
      mapped.external,
      JSON.stringify({ provider_event_type: mapped.sourceType }),
      provider,
    )
    .run();
  return json({ received: true });
}
function mapPayment(p: string, x: any) {
  const t = p === "stripe" ? x.type : x.event_type,
    o = p === "stripe" ? x.data?.object : x.data;
  const type = t?.includes("refund")
    ? "refund"
    : t?.includes("subscription.created")
      ? "subscription_started"
      : t?.includes("subscription.updated")
        ? "subscription_renewed"
        : t?.includes("subscription.canceled") ||
            t?.includes("subscription.cancelled")
          ? "subscription_cancelled"
          : t?.includes("checkout.session.completed") ||
              t === "transaction.completed"
            ? "purchase"
            : null;
  if (!type) return null;
  return {
    type,
    sourceType: t,
    property:
      o?.metadata?.property_id || o?.custom_data?.property_id || "replymind",
    funnel:
      o?.metadata?.funnel_id || o?.custom_data?.funnel_id || "replymind-main",
    amount: o?.amount_total ?? o?.totals?.grand_total ?? o?.amount ?? 0,
    currency: String(o?.currency_code || o?.currency || "USD").toUpperCase(),
    external: o?.id || x.id,
  };
}
export default {
  async fetch(req: Request, env: Env) {
    const u = new URL(req.url),
      ch = cors(req, env);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: ch });
    try {
      let r: Response;
      if (u.pathname === "/v1/events" && req.method === "POST")
        r = await collect(req, env);
      else if (u.pathname === "/v1/assign" && req.method === "POST") {
        const x = await req.json<any>();
        r = json({
          variant_id: assignVariant(x.visitor_id, x.experiment_id, x.variants),
        });
      } else if (u.pathname === "/v1/metrics" && req.method === "GET")
        r = admin(req, env)
          ? await metrics(u, env)
          : json({ error: "unauthorized" }, 401);
      else if (u.pathname === "/v1/funnels" && req.method === "PUT")
        r = admin(req, env)
          ? await saveFunnel(req, env)
          : json({ error: "unauthorized" }, 401);
      else if (u.pathname === "/v1/webhooks/stripe" && req.method === "POST")
        r = await webhook(req, env, "stripe");
      else if (u.pathname === "/v1/webhooks/paddle" && req.method === "POST")
        r = await webhook(req, env, "paddle");
      else if (u.pathname === "/health")
        r = json({ ok: true, environment: env.ENVIRONMENT });
      else r = json({ error: "not_found" }, 404);
      Object.entries(ch).forEach(([k, v]) => r.headers.set(k, v));
      return r;
    } catch (e) {
      return json(
        { error: "internal_error", request_id: crypto.randomUUID() },
        500,
        ch,
      );
    }
  },
};
