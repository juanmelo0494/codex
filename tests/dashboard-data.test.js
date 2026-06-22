import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardFromSupabaseRows, loadDashboardData } from "../lib/dashboard.js";

test("dashboard usa fixture declarado cuando falta Supabase server-side", async () => {
  const dashboard = await loadDashboardData({
    env: {
      AI_RADAR_API_TOKEN: "token",
    },
  });

  assert.equal(dashboard.contract, "ai-radar.dashboard-fixture.v1");
  assert.equal(dashboard.source.type, "fixture");
  assert.match(dashboard.source.fallback_reason, /SUPABASE_URL/);
});

test("dashboard adapta signals y sources persistidos desde Supabase", () => {
  const dashboard = buildDashboardFromSupabaseRows(
    {
      signals: [
        {
          slug: "openai-example",
          title: "OpenAI publica una novedad verificable",
          topic: "modelos",
          source_name: "OpenAI News",
          source_url: "https://openai.com/news/",
          published_on: "2026-06-21",
          consulted_on: "2026-06-21",
          evidence: "La fuente primaria describe el cambio con detalles suficientes para builders.",
          impact: "Afecta decisiones de producto y evaluacion tecnica.",
          action: "Probar el cambio en un flujo interno acotado.",
          status: "alta_prioridad_activo",
        },
      ],
      sources: [
        {
          name: "OpenAI News",
          url: "https://openai.com/news/",
          status: "activa",
          synced_at: "2026-06-21T12:00:00.000Z",
        },
      ],
    },
    { generatedAt: "2026-06-21T12:00:00.000Z" },
  );

  assert.equal(dashboard.contract, "ai-radar.dashboard-api.v1");
  assert.equal(dashboard.source.type, "api");
  assert.equal(dashboard.signals[0].title, "OpenAI publica una novedad verificable");
  assert.equal(dashboard.source_health[0].name, "OpenAI News");
});
