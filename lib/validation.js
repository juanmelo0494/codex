import { z } from "zod";

export const SOURCE_TYPES = [
  "fuente_oficial",
  "repo_tecnico",
  "comunidad",
  "medios_secundario",
];

export const SOURCE_STATUSES = ["activa", "pausada", "descartada"];

const SIGNAL_STATUSES = [
  "alta_prioridad_activo",
  "riesgo_regulatorio_en_desarrollo",
  "senal_tecnica_accionable",
  "infraestructura_critica_activo",
  "estrategica_emergente",
  "observacion",
];

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nonEmptyString = z.string().trim().min(1);
const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "usa YYYY-MM-DD");

const dateTimeStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "usa una fecha ISO valida",
});

const urlSchema = z.string().url();

export class PayloadValidationError extends Error {
  constructor(message, issues) {
    super(message);
    this.name = "PayloadValidationError";
    this.issues = issues;
  }
}

export function validationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

const sourceSchema = z
  .object({
    notion_page_url: urlSchema.optional().nullable(),
    name: nonEmptyString,
    type: z.enum(SOURCE_TYPES).optional().nullable(),
    url: urlSchema,
    status: z.enum(SOURCE_STATUSES).optional().nullable(),
    priority: optionalText,
    cadence: optionalText,
    notes: optionalText,
  })
  .passthrough();

const localSignalSchema = z
  .object({
    id: slugSchema,
    titulo: nonEmptyString,
    tema: nonEmptyString,
    fuente: z
      .object({
        nombre: nonEmptyString,
        url: urlSchema,
        publicado: dateStringSchema,
        consultado: dateStringSchema,
      })
      .strict(),
    evidencia: nonEmptyString,
    impacto: nonEmptyString,
    accion: nonEmptyString,
    estado: z.enum(SIGNAL_STATUSES),
  })
  .strict();

const dailySnapshotSchema = z
  .object({
    $schema: z.string(),
    contrato: z.literal("ai-radar.daily-signals.v1"),
    fecha: dateStringSchema,
    generado_en: dateTimeStringSchema,
    busqueda: z
      .object({
        consulta: nonEmptyString,
        idioma: z.string().trim().min(2),
        criterio: nonEmptyString,
        fuentes_consultadas: z.array(urlSchema).min(1),
      })
      .strict(),
    senales: z.array(localSignalSchema).min(1),
    sources_cache_status: optionalText,
    fallback_report: z.array(z.unknown()).optional().default([]),
  })
  .strict();

const nativeSignalSchema = z
  .object({
    slug: slugSchema,
    title: nonEmptyString,
    topic: optionalText,
    source_name: nonEmptyString,
    source_url: urlSchema,
    source_type: z.enum(SOURCE_TYPES).optional().nullable(),
    published_on: dateStringSchema.optional().nullable(),
    consulted_on: dateStringSchema,
    evidence: nonEmptyString,
    impact: nonEmptyString,
    action: nonEmptyString,
    status: nonEmptyString,
    raw: z.unknown().optional(),
    source: sourceSchema.optional(),
  })
  .strict();

const nativeRunSchema = z
  .object({
    query: nonEmptyString,
    window_start: dateStringSchema.optional().nullable(),
    window_end: dateStringSchema.optional().nullable(),
    status: z.enum(["completed", "failed"]).optional().default("completed"),
    sources_cache_status: optionalText,
    fallback_report: z.array(z.unknown()).optional().default([]),
    generated_at: dateTimeStringSchema.optional(),
    signals: z.array(nativeSignalSchema).min(1),
  })
  .strict();

const sourcesCacheSchema = z
  .object({
    fuentes_por_subagente: z.record(z.string(), z.array(sourceSchema)),
  })
  .passthrough();

const signalQuerySchema = z.object({
  fecha: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    dateStringSchema.optional(),
  ),
  source_type: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.enum(SOURCE_TYPES).optional(),
  ),
  limit: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.coerce.number().int().min(1).max(100).default(20),
  ),
});

export const uuidSchema = z.string().uuid();

export function normalizeRunPayload(rawPayload) {
  const localResult = dailySnapshotSchema.safeParse(rawPayload);
  if (localResult.success) {
    return normalizeDailySnapshot(localResult.data);
  }

  const nativeResult = nativeRunSchema.safeParse(rawPayload);
  if (nativeResult.success) {
    return normalizeNativeRun(nativeResult.data);
  }

  throw new PayloadValidationError("payload de run invalido", validationIssues(localResult.error));
}

export function normalizeDailySnapshot(snapshot) {
  return {
    query: snapshot.busqueda.consulta,
    window_start: snapshot.fecha,
    window_end: snapshot.fecha,
    status: "completed",
    sources_cache_status: snapshot.sources_cache_status,
    fallback_report: snapshot.fallback_report,
    generated_at: snapshot.generado_en,
    signals: snapshot.senales.map((signal) => ({
      slug: signal.id,
      title: signal.titulo,
      topic: signal.tema,
      source_name: signal.fuente.nombre,
      source_url: signal.fuente.url,
      published_on: signal.fuente.publicado,
      consulted_on: signal.fuente.consultado,
      evidence: signal.evidencia,
      impact: signal.impacto,
      action: signal.accion,
      status: signal.estado,
      raw: signal,
      source: {
        name: signal.fuente.nombre,
        url: signal.fuente.url,
        source_of_truth: "signal",
      },
    })),
  };
}

function normalizeNativeRun(run) {
  return {
    query: run.query,
    window_start: run.window_start ?? null,
    window_end: run.window_end ?? null,
    status: run.status,
    sources_cache_status: run.sources_cache_status,
    fallback_report: run.fallback_report,
    generated_at: run.generated_at,
    signals: run.signals.map((signal) => ({
      slug: signal.slug,
      title: signal.title,
      topic: signal.topic ?? null,
      source_name: signal.source_name,
      source_url: signal.source_url,
      published_on: signal.published_on ?? null,
      consulted_on: signal.consulted_on,
      evidence: signal.evidence,
      impact: signal.impact,
      action: signal.action,
      status: signal.status,
      raw: signal.raw ?? signal,
      source: signal.source
        ? normalizeSource(signal.source)
        : {
            name: signal.source_name,
            url: signal.source_url,
            type: signal.source_type ?? null,
            source_of_truth: "signal",
          },
    })),
  };
}

export function normalizeSourcesPayload(rawPayload) {
  const listResult = z.array(sourceSchema).safeParse(rawPayload);
  if (listResult.success) {
    return dedupeSources(listResult.data.map(normalizeSource));
  }

  const cacheResult = sourcesCacheSchema.safeParse(rawPayload);
  if (!cacheResult.success) {
    throw new PayloadValidationError("payload de sources invalido", validationIssues(cacheResult.error));
  }

  const sources = Object.values(cacheResult.data.fuentes_por_subagente)
    .flat()
    .filter((source) => source.status === "activa")
    .map(normalizeSource);

  return dedupeSources(sources);
}

export function normalizeSignalQuery(searchParams) {
  const result = signalQuerySchema.safeParse({
    fecha: searchParams.get("fecha"),
    source_type: searchParams.get("source_type"),
    limit: searchParams.get("limit"),
  });

  if (!result.success) {
    throw new PayloadValidationError("query de signals invalido", validationIssues(result.error));
  }

  return result.data;
}

function normalizeSource(source) {
  return {
    notion_page_url: source.notion_page_url ?? null,
    name: source.name.trim(),
    type: source.type ?? null,
    url: source.url,
    status: source.status ?? null,
    priority: source.priority ?? null,
    cadence: source.cadence ?? null,
    notes: source.notes ?? null,
    source_of_truth: source.source_of_truth ?? "notion",
  };
}

function dedupeSources(sources) {
  const deduped = new Map();
  for (const source of sources) {
    deduped.set(source.notion_page_url ?? source.url, source);
  }
  return [...deduped.values()];
}
