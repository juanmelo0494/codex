export async function syncSources(supabase, sources) {
  const synced = [];

  for (const source of sources) {
    synced.push(await upsertSource(supabase, source));
  }

  return synced;
}

export async function listSources(supabase, query = {}) {
  let builder = supabase
    .from("sources")
    .select("id, notion_page_url, name, type, url, status, priority, cadence, notes, source_of_truth, synced_at")
    .order("synced_at", { ascending: false })
    .limit(query.limit ?? 20);

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  const { data, error } = await builder;
  if (error) {
    throw new Error(`no se pudieron consultar sources: ${error.message}`);
  }

  return data;
}

export async function findOrCreateSourceForSignal(supabase, signal) {
  const existing = await findSource(supabase, signal.source);
  if (existing) {
    return existing.id;
  }

  const row = sourceToRow({
    ...signal.source,
    name: signal.source_name,
    url: signal.source_url,
    source_of_truth: signal.source?.source_of_truth ?? "signal",
  });
  const { data, error } = await supabase.from("sources").insert(row).select("id").single();
  if (error) {
    throw new Error(`no se pudo crear source: ${error.message}`);
  }
  return data.id;
}

async function upsertSource(supabase, source) {
  const existing = await findSource(supabase, source);
  const row = sourceToRow(source);

  if (existing) {
    const { data, error } = await supabase
      .from("sources")
      .update(row)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) {
      throw new Error(`no se pudo actualizar source: ${error.message}`);
    }
    return data;
  }

  const { data, error } = await supabase.from("sources").insert(row).select("id").single();
  if (error) {
    throw new Error(`no se pudo insertar source: ${error.message}`);
  }
  return data;
}

async function findSource(supabase, source) {
  if (source?.notion_page_url) {
    const { data, error } = await supabase
      .from("sources")
      .select("id")
      .eq("notion_page_url", source.notion_page_url)
      .maybeSingle();
    if (error) {
      throw new Error(`no se pudo buscar source por Notion: ${error.message}`);
    }
    if (data) {
      return data;
    }
  }

  if (!source?.url) {
    return null;
  }

  const { data, error } = await supabase
    .from("sources")
    .select("id")
    .eq("url", source.url)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`no se pudo buscar source por URL: ${error.message}`);
  }
  return data;
}

function sourceToRow(source) {
  return {
    notion_page_url: source.notion_page_url ?? null,
    name: source.name,
    type: source.type ?? null,
    url: source.url,
    status: source.status ?? null,
    priority: source.priority ?? null,
    cadence: source.cadence ?? null,
    notes: source.notes ?? null,
    source_of_truth: source.source_of_truth ?? "notion",
    synced_at: new Date().toISOString(),
  };
}
