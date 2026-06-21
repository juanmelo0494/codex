import { jsonError, requireBearerToken } from "../../../../lib/api/auth.js";
import { getSupabaseAdmin } from "../../../../lib/supabase/client.js";
import { getRunWithSignals } from "../../../../lib/supabase/runs.js";
import { validationIssues, uuidSchema } from "../../../../lib/validation.js";

export const runtime = "nodejs";

export async function GET(request, context) {
  const auth = requireBearerToken(request);
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const result = uuidSchema.safeParse(params.id);
  if (!result.success) {
    return jsonError(400, "invalid_run_id", "id de run invalido", validationIssues(result.error));
  }

  try {
    const supabase = getSupabaseAdmin();
    const payload = await getRunWithSignals(supabase, result.data);
    return Response.json(payload);
  } catch (error) {
    return jsonError(500, "get_run_failed", error.message);
  }
}
