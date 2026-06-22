#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { loadLocalEnv } from "../lib/env.js";
import { buildSourcesCache, sourceFromNotionApiPage } from "../lib/sources-cache.js";

loadLocalEnv();

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const notionToken = process.env.NOTION_API_KEY ?? process.env.NOTION_TOKEN;
const notionDataSourceId = args.dataSourceId ?? process.env.NOTION_DATA_SOURCE_ID;
const notionDatabaseId = args.databaseId ?? process.env.NOTION_DATABASE_ID;
const outputPath = resolve(args.output ?? "config/sources.json");

if (!notionToken) {
  console.error("error: NOTION_API_KEY es requerido");
  process.exit(1);
}

if (!notionDataSourceId && !notionDatabaseId) {
  console.error("error: NOTION_DATA_SOURCE_ID o NOTION_DATABASE_ID es requerido");
  process.exit(1);
}

const mode = notionDataSourceId ? "data_source" : "database";
const notionVersion = process.env.NOTION_VERSION ?? (mode === "data_source" ? "2025-09-03" : "2022-06-28");
const endpoint =
  mode === "data_source"
    ? `https://api.notion.com/v1/data_sources/${notionDataSourceId}/query`
    : `https://api.notion.com/v1/databases/${notionDatabaseId}/query`;

const pages = await queryAllPages(endpoint, notionToken, notionVersion);
const generatedAt = new Date().toISOString();
const notionDataSourceUrl =
  args.dataSourceUrl ??
  process.env.NOTION_DATA_SOURCE_URL ??
  (notionDataSourceId ? `collection://${notionDataSourceId}` : undefined);
const cache = buildSourcesCache(pages.map(sourceFromNotionApiPage), {
  generatedAt,
  notionDatabaseUrl: args.databaseUrl ?? process.env.NOTION_DATABASE_URL,
  notionDataSourceUrl,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: outputPath,
      mode,
      notion_version: notionVersion,
      pages_count: pages.length,
      active_sources_count: Object.values(cache.fuentes_por_subagente).flat().length,
    },
    null,
    2,
  ),
);

async function queryAllPages(endpointUrl, token, notionVersionHeader) {
  const pages = [];
  let startCursor;

  do {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "notion-version": notionVersionHeader,
      },
      body: JSON.stringify({
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
        filter: {
          property: "Status",
          select: {
            equals: "activa",
          },
        },
        sorts: [
          {
            property: "Name",
            direction: "ascending",
          },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`Notion respondio ${response.status}: ${payload.message ?? JSON.stringify(payload)}`);
    }

    pages.push(...(payload.results ?? []));
    startCursor = payload.has_more ? payload.next_cursor : null;
  } while (startCursor);

  return pages;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--output") {
      parsed.output = rawArgs[++index];
    } else if (arg === "--data-source-id") {
      parsed.dataSourceId = rawArgs[++index];
    } else if (arg === "--database-id") {
      parsed.databaseId = rawArgs[++index];
    } else if (arg === "--database-url") {
      parsed.databaseUrl = rawArgs[++index];
    } else if (arg === "--data-source-url") {
      parsed.dataSourceUrl = rawArgs[++index];
    } else {
      throw new Error(`argumento no soportado: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`uso: node scripts/refresh_sources_cache.js [opciones]

Opciones:
  --output <path>            Ruta de salida. Default: config/sources.json
  --data-source-id <id>      ID de data source de Notion. Default: NOTION_DATA_SOURCE_ID
  --database-id <id>         ID legacy de database de Notion. Default: NOTION_DATABASE_ID
  --database-url <url>       URL de la database para metadata del cache.
  --data-source-url <url>    URL collection://... para metadata del cache.

Variables:
  NOTION_API_KEY             Token de integracion de Notion.
  NOTION_DATA_SOURCE_ID      Preferido para Notion API 2025-09-03.
  NOTION_DATABASE_ID         Fallback legacy para Notion API 2022-06-28.
`);
}
