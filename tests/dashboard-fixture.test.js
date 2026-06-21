import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("fixture de dashboard declara datos suficientes para la UI", async () => {
  const dashboard = JSON.parse(
    await readFile(new URL("../fixtures/dashboard.json", import.meta.url), "utf8"),
  );

  assert.equal(dashboard.contract, "ai-radar.dashboard-fixture.v1");
  assert.equal(dashboard.source.type, "fixture");
  assert.equal(dashboard.signals.length, dashboard.page_size);
  assert.ok(dashboard.total_signals >= dashboard.signals.length);
  assert.ok(dashboard.source_health.length >= 1);

  for (const signal of dashboard.signals) {
    assert.equal(typeof signal.slug, "string");
    assert.equal(typeof signal.title, "string");
    assert.equal(typeof signal.category, "string");
    assert.ok(Number.isInteger(signal.impact_score));
    assert.ok(signal.impact_score >= 0 && signal.impact_score <= 100);
    assert.ok(Number.isInteger(signal.confidence_score));
    assert.ok(signal.confidence_score >= 0 && signal.confidence_score <= 100);
    assert.ok(["high", "medium", "low"].includes(signal.confidence_level));
    assert.ok(["unique", "possible"].includes(signal.duplicate_status));
    assert.ok(Array.isArray(signal.sources));
    assert.ok(signal.sources.length >= 1);
  }
});
