import { findOrCreateSourceForSignal } from "./sources.js";

export async function saveRun(supabase, run) {
  const runRow = {
    query: run.query,
    window_start: run.window_start,
    window_end: run.window_end,
    status: run.status,
    sources_cache_status: run.sources_cache_status,
    fallback_report: run.fallback_report,
    generated_at: run.generated_at,
  };

  const { data: createdRun, error: runError } = await supabase
    .from("runs")
    .insert(runRow)
    .select("id")
    .single();

  if (runError) {
    throw new Error(`no se pudo guardar run: ${runError.message}`);
  }

  try {
    const signalRows = [];
    for (const signal of run.signals) {
      const sourceId = await findOrCreateSourceForSignal(supabase, signal);
      signalRows.push(signalToRow(createdRun.id, sourceId, signal));
    }

    const { error: signalsError } = await supabase.from("signals").insert(signalRows);
    if (signalsError) {
      throw new Error(`no se pudieron guardar signals: ${signalsError.message}`);
    }

    return {
      run_id: createdRun.id,
      signals_count: signalRows.length,
    };
  } catch (error) {
    await supabase.from("runs").delete().eq("id", createdRun.id);
    throw error;
  }
}

export async function getRunWithSignals(supabase, runId) {
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("id, query, window_start, window_end, status, sources_cache_status, fallback_report, generated_at")
    .eq("id", runId)
    .single();

  if (runError) {
    throw new Error(`no se pudo consultar run: ${runError.message}`);
  }

  const { data: signals, error: signalsError } = await supabase
    .from("signals")
    .select(
      "id, run_id, source_id, slug, title, topic, source_name, source_url, published_on, consulted_on, evidence, impact, action, status, raw",
    )
    .eq("run_id", runId)
    .order("published_on", { ascending: false })
    .order("consulted_on", { ascending: false });

  if (signalsError) {
    throw new Error(`no se pudieron consultar signals: ${signalsError.message}`);
  }

  return { run, signals };
}

function signalToRow(runId, sourceId, signal) {
  return {
    run_id: runId,
    source_id: sourceId,
    slug: signal.slug,
    title: signal.title,
    topic: signal.topic,
    source_name: signal.source_name,
    source_url: signal.source_url,
    published_on: signal.published_on,
    consulted_on: signal.consulted_on,
    evidence: signal.evidence,
    impact: signal.impact,
    action: signal.action,
    status: signal.status,
    raw: signal.raw,
  };
}
