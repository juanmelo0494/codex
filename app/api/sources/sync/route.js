import { jsonError, requireBearerToken } from "../../../../lib/api/auth.js";
import { getSupabaseAdmin } from "../../../../lib/supabase/client.js";
import { syncSources } from "../../../../lib/supabase/sources.js";
import { PayloadValidationError, normalizeSourcesPayload } from "../../../../lib/validation.js";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = requireBearerToken(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "el body debe ser JSON valido");
  }

  let sources;
  try {
    sources = normalizeSourcesPayload(body);
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return jsonError(400, "invalid_payload", error.message, error.issues);
    }
    throw error;
  }

  try {
    const supabase = getSupabaseAdmin();
    const synced = await syncSources(supabase, sources);
    return Response.json({ synced_count: synced.length });
  } catch (error) {
    return jsonError(500, "sync_sources_failed", error.message);
  }
}
