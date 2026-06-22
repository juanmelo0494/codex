import { createRequire } from "node:module";

import { getSupabaseAdmin } from "./supabase/client.js";
import { getSupabaseEnvStatus } from "./supabase/diagnostics.js";
import { listSignals } from "./supabase/signals.js";
import { listSources } from "./supabase/sources.js";

const require = createRequire(import.meta.url);
const fixtureDashboard = require("../fixtures/dashboard.json");

const STATUS_TO_CATEGORY = {
  alta_prioridad_activo: "Prioridad",
  riesgo_regulatorio_en_desarrollo: "Politica",
  senal_tecnica_accionable: "Tecnica",
  infraestructura_critica_activo: "Infraestructura",
  estrategica_emergente: "Estrategia",
  observacion: "Observacion",
};

const STATUS_TO_IMPACT = {
  alta_prioridad_activo: 92,
  riesgo_regulatorio_en_desarrollo: 82,
  senal_tecnica_accionable: 78,
  infraestructura_critica_activo: 74,
  estrategica_emergente: 68,
  observacion: 52,
};

const SOURCE_TONES = ["red", "green", "purple", "dark", "blue", "orange", "green-dark", "light", "navy"];

export async function loadDashboardData(options = {}) {
  const envStatus = getSupabaseEnvStatus(options.env);
  if (!envStatus.variables.SUPABASE_URL || !envStatus.variables.SUPABASE_SERVICE_ROLE_KEY) {
    return fallbackDashboard(`faltan variables server-side: ${envStatus.missing.join(", ")}`);
  }

  try {
    const supabase = getSupabaseAdmin();
    const [signals, sources] = await Promise.all([
      listSignals(supabase, { limit: 10 }),
      listSources(supabase, { status: "activa", limit: 20 }),
    ]);
    return buildDashboardFromSupabaseRows({ signals, sources });
  } catch (error) {
    return fallbackDashboard(`Supabase no disponible: ${error.message}`);
  }
}

export function buildDashboardFromSupabaseRows({ signals = [], sources = [] }, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const dashboardSignals = signals.map((signal, index) => signalToDashboardSignal(signal, index));
  const sourceHealth = sourcesToHealth(sources, signals);

  return {
    contract: "ai-radar.dashboard-api.v1",
    source: {
      type: "api",
      description:
        "Datos leidos server-side desde Supabase. Los scores visuales se derivan de status y completitud hasta que exista ranking persistido.",
      related_api: "GET /api/signals?fecha=&source_type=&limit=",
    },
    generated_at: generatedAt,
    updated_label: timeLabel(generatedAt),
    window_label: "Ultimos registros persistidos",
    total_signals: dashboardSignals.length,
    page_size: dashboardSignals.length,
    signals: dashboardSignals,
    source_health: sourceHealth,
    summary: {
      extra_sources: Math.max(0, sources.length - sourceHealth.length),
      extra_sources_score: sourceHealth.length ? roundedAverage(sourceHealth.map((source) => source.score)) : 0,
    },
  };
}

function fallbackDashboard(reason) {
  const dashboard = structuredClone(fixtureDashboard);
  dashboard.source = {
    ...dashboard.source,
    fallback_reason: reason,
  };
  return dashboard;
}

function signalToDashboardSignal(signal, index) {
  const impactScore = STATUS_TO_IMPACT[signal.status] ?? 50;
  const sourceName = signal.source_name;
  const confidenceScore = confidenceForSignal(signal);

  return {
    rank: index + 1,
    slug: signal.slug,
    title: signal.title,
    category: STATUS_TO_CATEGORY[signal.status] ?? "Senal",
    topic: signal.topic ?? "sin tema",
    impact_score: impactScore,
    impact_label: impactScore >= 80 ? "Muy alto" : impactScore >= 60 ? "Alto" : "Medio",
    confidence_score: confidenceScore,
    confidence_level: confidenceScore >= 80 ? "high" : confidenceScore >= 55 ? "medium" : "low",
    recency_label: recencyLabel(signal.published_on ?? signal.consulted_on),
    observed_at: signal.consulted_on,
    sources: [
      {
        label: sourceLabel(sourceName),
        name: sourceName,
        tone: SOURCE_TONES[index % SOURCE_TONES.length],
      },
    ],
    additional_sources: 0,
    duplicate_status: "unique",
    evidence: signal.evidence,
    action: signal.action,
  };
}

function sourcesToHealth(sources, signals) {
  const byName = new Map();
  for (const source of sources) {
    byName.set(source.name, source);
  }
  for (const signal of signals) {
    if (!byName.has(signal.source_name)) {
      byName.set(signal.source_name, {
        name: signal.source_name,
        url: signal.source_url,
        type: signal.source_type,
        status: "activa",
      });
    }
  }

  return [...byName.values()].slice(0, 8).map((source, index) => {
    const score = source.status === "activa" ? 86 : 62;
    return {
      name: source.name,
      label: sourceLabel(source.name),
      score,
      lag_label: source.synced_at ? recencyLabel(source.synced_at) : "sin sync",
      tone: SOURCE_TONES[index % SOURCE_TONES.length],
      trend: trendForScore(score),
    };
  });
}

function confidenceForSignal(signal) {
  let score = 48;
  if (signal.source_url) score += 18;
  if (signal.published_on) score += 14;
  if (signal.evidence?.length > 80) score += 10;
  if (signal.action?.length > 30) score += 10;
  return Math.min(96, score);
}

function sourceLabel(name) {
  return String(name)
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function trendForScore(score) {
  return Array.from({ length: 12 }, (_, index) => Math.max(20, Math.min(99, score - 5 + (index % 4) * 2)));
}

function recencyLabel(value) {
  if (!value) {
    return "sin fecha";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "sin fecha";
  }

  const days = Math.max(0, Math.round((Date.now() - parsed.getTime()) / 86_400_000));
  if (days === 0) {
    return "hoy";
  }
  if (days === 1) {
    return "1d";
  }
  return `${days}d`;
}

function timeLabel(value) {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function roundedAverage(values) {
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}
