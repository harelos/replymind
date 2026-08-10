import test from "node:test";
import assert from "node:assert/strict";
import {
  createFunnelRuntime,
  FUNNELS,
  stableVariant,
} from "../public/funnel-runtime.js";
const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
};
const setup = (consent = "granted") => {
  const events = [],
    storage = memory({ replymind_analytics_consent: consent }),
    session = memory();
  const args = {
    storage,
    session,
    transport: (e) => events.push(e),
    uuid: (() => {
      let n = 0;
      return () => `id-${++n}`;
    })(),
    now: () => "2026-08-10T12:00:00.000Z",
    property: "dopamodoro",
  };
  return { events, storage, session, args, runtime: createFunnelRuntime(args) };
};
test("all variants have stable experiment, step, and variant IDs", () => {
  const f = FUNNELS.dopamodoro;
  for (const stage of ["advertorial", "sales", "quiz"]) {
    assert.ok(f.steps[stage]);
    assert.ok(f.experiments[stage].experimentId);
    for (const v of f.experiments[stage].variants)
      assert.match(v, /^[a-z0-9-]+$/);
    assert.equal(
      stableVariant("visitor-a", f.experiments[stage]),
      stableVariant("visitor-a", f.experiments[stage]),
    );
  }
});
test("exposure is deduplicated across refresh and back-forward runtime recreation", () => {
  const x = setup();
  assert.equal(x.runtime.expose("quiz"), true);
  assert.equal(x.runtime.expose("quiz"), false);
  const recreated = createFunnelRuntime(x.args);
  assert.equal(recreated.expose("quiz"), false);
  assert.equal(
    x.events.filter((e) => e.event_type === "variant_exposed").length,
    1,
  );
});
test("consent denial emits and persists no exposure", () => {
  const x = setup("denied");
  assert.equal(x.runtime.expose("sales"), false);
  assert.equal(x.events.length, 0);
  assert.equal(
    Object.keys(x.storage.dump()).some((k) => k.startsWith("fa_exposure:")),
    false,
  );
});
test("Dopamodoro journey excludes checkout and quiz handoff is explicit", () => {
  const x = setup();
  assert.deepEqual(x.runtime.config.journey, [
    "advertorial",
    "sales",
    "quiz",
    "play",
  ]);
  assert.equal(x.runtime.config.journey.includes("checkout"), false);
  x.runtime.quiz("start");
  x.runtime.quiz("complete");
  x.runtime.playHandoff();
  assert.deepEqual(
    x.events.map((e) => e.event_type),
    ["quiz_started", "quiz_completed", "play_handoff_clicked"],
  );
  assert.equal(x.events[2].metadata.destination, "play");
});
test("assignment remains stable in a new session for the same visitor", () => {
  const x = setup();
  const first = x.runtime;
  const second = createFunnelRuntime({ ...x.args, session: memory() });
  assert.equal(first.visitorId, second.visitorId);
  assert.equal(
    stableVariant(first.visitorId, first.config.experiments.advertorial),
    stableVariant(second.visitorId, second.config.experiments.advertorial),
  );
});
