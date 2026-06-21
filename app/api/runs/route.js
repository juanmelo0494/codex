import { jsonError, requireBearerToken } from "../../../lib/api/auth.js";
import { getSupabaseAdmin } from "../../../lib/supabase/client.js";
import { saveRun } from "../../../lib/supabase/runs.js";
import { PayloadValidationError, normalizeRunPayload } from "../../../lib/validation.js";

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

  let run;
  try {
    run = normalizeRunPayload(body);
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return jsonError(400, "invalid_payload", error.message, error.issues);
    }
    throw error;
  }

  try {
    const supabase = getSupabaseAdmin();
    const result = await saveRun(supabase, run);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return jsonError(500, "save_run_failed", error.message);
  }
}
