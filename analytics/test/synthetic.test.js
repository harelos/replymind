import test from "node:test";import assert from "node:assert/strict";
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
test("synthetic funnel KPIs reconcile",()=>{const a={visits:100,advertorial:90,sales:45,checkout:18,purchases:9,revenue:27000,refunds:1,cost:9000};assert.equal(pct(a.sales,a.advertorial),50);assert.equal(pct(a.checkout,a.sales),40);assert.equal(pct(a.purchases,a.checkout),50);assert.equal(pct(a.purchases,a.visits),9);assert.equal(Math.round(a.cost/a.purchases),1000)});
test("zero denominators are explicitly null",()=>assert.equal(pct(0,0),null));
