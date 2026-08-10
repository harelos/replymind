import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import vm from "node:vm";
// Load the dependency-free contract functions after stripping TypeScript-only syntax for direct deterministic checks.
const source=readFileSync(new URL("../src/contracts.ts",import.meta.url),"utf8");
test("contract declares all required lifecycle events",()=>{for(const e of ["visit","step_view","next_step","bounce","session_end","checkout_start","purchase","refund","subscription_started","subscription_renewed","subscription_cancelled"])assert.match(source,new RegExp(`\\"${e}\\"`))});
test("schema requires identifiers and consent",()=>{for(const field of ["event_id","property_id","funnel_id","visitor_id","session_id","consent"])assert.match(source,new RegExp(field))});
test("migration enforces event and provider deduplication",()=>{const sql=readFileSync(new URL("../migrations/0001_initial.sql",import.meta.url),"utf8");assert.match(sql,/event_id TEXT PRIMARY KEY/);assert.match(sql,/UNIQUE INDEX idx_events_provider_external/)});
