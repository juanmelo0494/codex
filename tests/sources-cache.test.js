import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSourcesCache,
  sourceFromNotionApiPage,
  sourceFromNotionMcpFetchText,
} from "../lib/sources-cache.js";

test("construye cache de fuentes activas agrupadas por subagente", () => {
  const cache = buildSourcesCache(
    [
      {
        name: "OpenAI News",
        type: "fuente_oficial",
        status: "activa",
        url: "https://openai.com/news/",
        priority: "alta",
      },
      {
        name: "Fuente pausada",
        type: "fuente_oficial",
        status: "pausada",
        url: "https://example.com/paused",
      },
    ],
    {
      generatedAt: "2026-06-21T12:00:00.000Z",
      notionDatabaseUrl: "https://app.notion.com/p/db",
      notionDataSourceUrl: "collection://sources",
    },
  );

  assert.equal(cache.contrato, "ai-radar.sources-cache.v1");
  assert.equal(cache.fuentes_por_subagente["ai-radar-fuentes-oficiales"].length, 1);
  assert.equal(cache.fuentes_por_subagente["ai-radar-fuentes-oficiales"][0].name, "OpenAI News");
  assert.equal(cache.fuentes_por_subagente["ai-radar-comunidad"].length, 0);
});

test("extrae una fuente desde fetch de Notion MCP", () => {
  const source = sourceFromNotionMcpFetchText(`<page>
<properties>
{"Name":"The Decoder","Type":"medios_secundario","Status":"activa","Priority":"media","Cadence":"diaria","Notes":"Medio especializado","url":"https://app.notion.com/p/source","userDefined:URL":"https://www.thedecoder.com/"}
</properties>
</page>`);

  assert.deepEqual(source, {
    name: "The Decoder",
    type: "medios_secundario",
    status: "activa",
    url: "https://www.thedecoder.com/",
    priority: "media",
    cadence: "diaria",
    notes: "Medio especializado",
    notion_page_url: "https://app.notion.com/p/source",
  });
});

test("extrae una fuente desde respuesta de Notion API", () => {
  const source = sourceFromNotionApiPage({
    url: "https://app.notion.com/p/source",
    properties: {
      Name: { title: [{ plain_text: "r/LocalLLaMA" }] },
      Type: { select: { name: "comunidad" } },
      Status: { select: { name: "activa" } },
      Priority: { select: { name: "media" } },
      Cadence: { select: { name: "diaria" } },
      Notes: { rich_text: [{ plain_text: "Comunidad tecnica" }] },
      URL: { url: "https://www.reddit.com/r/LocalLLaMA/" },
    },
  });

  assert.equal(source.name, "r/LocalLLaMA");
  assert.equal(source.type, "comunidad");
  assert.equal(source.url, "https://www.reddit.com/r/LocalLLaMA/");
});
