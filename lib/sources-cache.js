export const TYPE_TO_SUBAGENT = {
  fuente_oficial: "ai-radar-fuentes-oficiales",
  repo_tecnico: "ai-radar-repo-tecnico",
  comunidad: "ai-radar-comunidad",
  medios_secundario: "ai-radar-medios-secundarios",
};

const SOURCE_FIELDS = [
  "name",
  "type",
  "status",
  "url",
  "priority",
  "cadence",
  "notes",
  "notion_page_url",
];

export function buildSourcesCache(sources, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const normalized = dedupeSources(
    sources
      .map(normalizeSourceRecord)
      .filter(Boolean)
      .filter((source) => source.status === "activa" && TYPE_TO_SUBAGENT[source.type]),
  );
  const groups = Object.fromEntries(Object.values(TYPE_TO_SUBAGENT).map((id) => [id, []]));

  for (const source of normalized) {
    groups[TYPE_TO_SUBAGENT[source.type]].push(source);
  }

  for (const group of Object.values(groups)) {
    group.sort((left, right) => left.name.localeCompare(right.name));
  }

  return stripEmpty({
    contrato: "ai-radar.sources-cache.v1",
    generado_en: generatedAt,
    origen: options.origin ?? "notion",
    notion_database: options.notionDatabase ?? "AI radar Sources",
    notion_database_url: options.notionDatabaseUrl,
    notion_data_source_url: options.notionDataSourceUrl,
    notion_consultado_en: options.notionConsultedAt ?? generatedAt,
    type_to_subagent: TYPE_TO_SUBAGENT,
    fuentes_por_subagente: groups,
  });
}

export function sourceFromNotionApiPage(page) {
  const properties = page?.properties;
  if (!properties || typeof properties !== "object") {
    return null;
  }

  return normalizeSourceRecord({
    name: titleValue(properties.Name),
    type: optionValue(properties.Type),
    status: optionValue(properties.Status),
    url: urlValue(properties.URL ?? properties["userDefined:URL"]),
    priority: optionValue(properties.Priority),
    cadence: optionValue(properties.Cadence),
    notes: richTextValue(properties.Notes),
    notion_page_url: page.url,
  });
}

export function sourceFromNotionMcpFetchText(text) {
  const match = String(text).match(/<properties>\s*([\s\S]*?)\s*<\/properties>/);
  if (!match) {
    return null;
  }

  const properties = JSON.parse(match[1]);
  return sourceFromFlatNotionProperties(properties);
}

export function sourceFromFlatNotionProperties(properties) {
  if (!properties || typeof properties !== "object") {
    return null;
  }

  return normalizeSourceRecord({
    name: properties.Name,
    type: properties.Type,
    status: properties.Status,
    url: properties["userDefined:URL"] ?? properties.URL,
    priority: properties.Priority,
    cadence: properties.Cadence,
    notes: properties.Notes,
    notion_page_url: properties.url,
  });
}

export function normalizeSourceRecord(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const normalized = {};
  for (const field of SOURCE_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && value.trim()) {
      normalized[field] = value.trim();
    }
  }

  if (!normalized.name || !normalized.url) {
    return null;
  }

  return normalized;
}

function dedupeSources(sources) {
  const deduped = new Map();
  for (const source of sources) {
    deduped.set(source.notion_page_url ?? source.url, source);
  }
  return [...deduped.values()];
}

function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null));
}

function titleValue(property) {
  return richTextArrayValue(property?.title);
}

function richTextValue(property) {
  return richTextArrayValue(property?.rich_text);
}

function richTextArrayValue(items) {
  return Array.isArray(items) ? items.map((item) => item.plain_text ?? "").join("").trim() : "";
}

function optionValue(property) {
  return property?.select?.name ?? property?.status?.name ?? "";
}

function urlValue(property) {
  return property?.url ?? "";
}
