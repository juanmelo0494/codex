import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PayloadValidationError,
  normalizeRunPayload,
  normalizeSignalQuery,
  normalizeSourcesPayload,
} from "../lib/validation.js";

test("normaliza un snapshot diario al payload de runs", async () => {
  const snapshot = JSON.parse(
    await readFile(new URL("../data/daily/2026-06-21.json", import.meta.url), "utf8"),
  );

  const run = normalizeRunPayload(snapshot);

  assert.equal(run.query, "5 noticias recientes de IA como senales de AI Radar");
  assert.equal(run.window_start, "2026-06-21");
  assert.equal(run.signals.length, 5);
  assert.equal(run.signals[0].slug, "g7-ceos-ia-geopolitica");
  assert.equal(run.signals[0].source.source_of_truth, "signal");
});

test("normaliza sources activas desde cache de Notion", () => {
  const sources = normalizeSourcesPayload({
    fuentes_por_subagente: {
      "ai-radar-fuentes-oficiales": [
        {
          name: "OpenAI News",
          type: "fuente_oficial",
          status: "activa",
          url: "https://openai.com/news/",
          notion_page_url: "https://app.notion.com/p/example",
        },
        {
          name: "Paused",
          type: "fuente_oficial",
          status: "pausada",
          url: "https://example.com/paused",
        },
      ],
    },
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0].name, "OpenAI News");
});

test("rechaza payloads de run invalidos", () => {
  assert.throws(() => normalizeRunPayload({ senales: [] }), PayloadValidationError);
});

test("normaliza query params de signals", () => {
  const params = new URLSearchParams({
    fecha: "2026-06-21",
    source_type: "fuente_oficial",
    limit: "3",
  });

  assert.deepEqual(normalizeSignalQuery(params), {
    fecha: "2026-06-21",
    source_type: "fuente_oficial",
    limit: 3,
  });
});
