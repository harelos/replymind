export const FUNNELS = Object.freeze({
  replymind: Object.freeze({
    propertyId: "replymind",
    funnelId: "replymind-main",
    steps: Object.freeze({
      advertorial: "replymind-advertorial",
      sales: "replymind-sales",
      checkout: "replymind-checkout",
    }),
    experiments: Object.freeze({
      advertorial: {
        experimentId: "rm-adv-2026-08",
        variants: ["story", "reasons"],
        primaryMetric: "next_step_reached",
        guardrails: ["bounce"],
        defaultVariant: "story",
      },
      sales: {
        experimentId: "rm-sales-2026-08",
        variants: ["long", "short"],
        primaryMetric: "checkout_started",
        guardrails: ["bounce"],
        defaultVariant: "long",
      },
    }),
  }),
  dopamodoro: Object.freeze({
    propertyId: "dopamodoro",
    funnelId: "dopamodoro-acquisition-v1",
    journey: Object.freeze(["advertorial", "sales", "quiz", "play"]),
    steps: Object.freeze({
      advertorial: "dopa-advertorial",
      sales: "dopa-sales",
      quiz: "dopa-quiz-onboarding",
      play: "dopa-play-handoff",
    }),
    experiments: Object.freeze({
      advertorial: {
        experimentId: "dopa-adv-2026-08",
        variants: ["focus-story", "adhd-reasons"],
        primaryMetric: "next_step_reached",
        guardrails: ["bounce"],
        defaultVariant: "focus-story",
      },
      sales: {
        experimentId: "dopa-sales-2026-08",
        variants: ["coach", "timer"],
        primaryMetric: "quiz_started",
        guardrails: ["bounce"],
        defaultVariant: "coach",
      },
      quiz: {
        experimentId: "dopa-quiz-2026-08",
        variants: ["quick-start", "guided"],
        primaryMetric: "play_handoff_clicked",
        guardrails: ["quiz_abandoned"],
        defaultVariant: "quick-start",
      },
    }),
  }),
});

export function stableVariant(visitorId, experiment) {
  let hash = 2166136261;
  const input = experiment.experimentId + ":" + visitorId;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return experiment.variants[(hash >>> 0) % experiment.variants.length];
}

export function createFunnelRuntime({
  storage,
  session,
  transport,
  now = () => new Date().toISOString(),
  uuid = () => crypto.randomUUID(),
  consentKey = "replymind_analytics_consent",
  property = "replymind",
}) {
  const config = FUNNELS[property];
  if (!config) throw new Error("unknown property");
  const visitorId = storage.getItem("fa_visitor_id") || uuid(),
    sessionId = session.getItem("fa_session_id") || uuid();
  storage.setItem("fa_visitor_id", visitorId);
  session.setItem("fa_session_id", sessionId);
  const consent = () => storage.getItem(consentKey) === "granted";
  function emit(event_type, stage, detail = {}) {
    if (!consent()) return false;
    const experiment = config.experiments[stage],
      variant_id = experiment
        ? stableVariant(visitorId, experiment)
        : undefined;
    transport({
      ...detail,
      event_id: detail.event_id || uuid(),
      event_type,
      occurred_at: now(),
      property_id: config.propertyId,
      funnel_id: config.funnelId,
      experiment_id: experiment?.experimentId,
      variant_id,
      step_id: config.steps[stage],
      visitor_id: visitorId,
      session_id: sessionId,
      consent: "analytics",
    });
    return true;
  }
  function expose(stage) {
    const experiment = config.experiments[stage];
    if (!experiment) return false;
    const variant = stableVariant(visitorId, experiment),
      key = `fa_exposure:${visitorId}:${experiment.experimentId}:${config.steps[stage]}`;
    if (storage.getItem(key)) return false;
    if (!consent()) return false;
    storage.setItem(key, "1");
    return emit("variant_exposed", stage, {
      event_id: `exposure:${visitorId}:${experiment.experimentId}:${variant}`,
    });
  }
  function transition(from, to) {
    return emit("next_step_reached", from, {
      previous_step_id: config.steps[from],
      metadata: { destination_step_id: config.steps[to] },
    });
  }
  function quiz(action) {
    return emit(action === "start" ? "quiz_started" : "quiz_completed", "quiz");
  }
  function playHandoff() {
    return emit("play_handoff_clicked", "quiz", {
      metadata: { destination: "play" },
    });
  }
  return {
    config,
    visitorId,
    sessionId,
    consent,
    emit,
    expose,
    transition,
    quiz,
    playHandoff,
  };
}
