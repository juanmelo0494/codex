export async function listSignals(supabase, query) {
  let builder = supabase
    .from("signals")
    .select(
      "id, run_id, source_id, slug, title, topic, source_name, source_url, published_on, consulted_on, evidence, impact, action, status",
    );

  if (query.fecha) {
    builder = builder.eq("consulted_on", query.fecha);
  }

  if (query.source_type) {
    const sourceIds = await sourceIdsByType(supabase, query.source_type);
    if (sourceIds.length === 0) {
      return [];
    }
    builder = builder.in("source_id", sourceIds);
  }

  const { data, error } = await builder
    .order("published_on", { ascending: false })
    .order("consulted_on", { ascending: false })
    .limit(query.limit);

  if (error) {
    throw new Error(`no se pudieron consultar signals: ${error.message}`);
  }

  return data;
}

async function sourceIdsByType(supabase, sourceType) {
  const { data, error } = await supabase.from("sources").select("id").eq("type", sourceType);
  if (error) {
    throw new Error(`no se pudieron consultar sources por tipo: ${error.message}`);
  }
  return data.map((source) => source.id);
}
