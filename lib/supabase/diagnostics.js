export const REQUIRED_SUPABASE_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "AI_RADAR_API_TOKEN"];

export const REQUIRED_SUPABASE_TABLES = [
  {
    name: "sources",
    columns: "id, notion_page_url, name, type, url, status, priority, cadence, notes, source_of_truth, synced_at",
  },
  {
    name: "runs",
    columns: "id, query, window_start, window_end, status, sources_cache_status, fallback_report, generated_at",
  },
  {
    name: "signals",
    columns:
      "id, run_id, source_id, slug, title, topic, source_name, source_url, published_on, consulted_on, evidence, impact, action, status, raw",
  },
];

export function getSupabaseEnvStatus(env = process.env) {
  const variables = Object.fromEntries(
    REQUIRED_SUPABASE_ENV.map((name) => [name, Boolean(env[name] && String(env[name]).trim())]),
  );
  const missing = Object.entries(variables)
    .filter(([, isSet]) => !isSet)
    .map(([name]) => name);

  return {
    ok: missing.length === 0,
    variables,
    missing,
  };
}

export async function checkSupabaseTables(supabase) {
  const tables = {};
  for (const table of REQUIRED_SUPABASE_TABLES) {
    const { error } = await supabase.from(table.name).select(table.columns).limit(1);
    tables[table.name] = error
      ? {
          ok: false,
          code: error.code,
          message: error.message,
        }
      : {
          ok: true,
        };
  }

  return {
    ok: Object.values(tables).every((table) => table.ok),
    tables,
  };
}
