import { jsonError, requireBearerToken } from "../../../lib/api/auth.js";
import { getSupabaseAdmin } from "../../../lib/supabase/client.js";
import { listSignals } from "../../../lib/supabase/signals.js";
import { PayloadValidationError, normalizeSignalQuery } from "../../../lib/validation.js";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = requireBearerToken(request);
  if (!auth.ok) {
    return auth.response;
  }

  let query;
  try {
    query = normalizeSignalQuery(new URL(request.url).searchParams);
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return jsonError(400, "invalid_query", error.message, error.issues);
    }
    throw error;
  }

  try {
    const supabase = getSupabaseAdmin();
    const signals = await listSignals(supabase, query);
    return Response.json({ signals, count: signals.length });
  } catch (error) {
    return jsonError(500, "list_signals_failed", error.message);
  }
}
