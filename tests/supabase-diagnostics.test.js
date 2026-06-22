import assert from "node:assert/strict";
import test from "node:test";

import { checkSupabaseTables, getSupabaseEnvStatus } from "../lib/supabase/diagnostics.js";

test("diagnostico Supabase reporta variables faltantes sin exponer secretos", () => {
  const status = getSupabaseEnvStatus({
    SUPABASE_URL: "https://example.supabase.co",
  });

  assert.equal(status.ok, false);
  assert.equal(status.variables.SUPABASE_URL, true);
  assert.equal(status.variables.SUPABASE_SERVICE_ROLE_KEY, false);
  assert.equal(status.variables.AI_RADAR_API_TOKEN, false);
  assert.deepEqual(status.missing, ["SUPABASE_SERVICE_ROLE_KEY", "AI_RADAR_API_TOKEN"]);
});

test("diagnostico Supabase valida tablas con lecturas reales", async () => {
  const calls = [];
  const supabase = {
    from(table) {
      return {
        select(columns, options) {
          calls.push({ table, columns, options });
          return {
            async limit() {
              if (table === "signals") {
                return {
                  error: {
                    code: "PGRST205",
                    message: "Could not find the table 'public.signals' in the schema cache",
                  },
                };
              }
              return { error: null };
            },
          };
        },
      };
    },
  };

  const status = await checkSupabaseTables(supabase);

  assert.equal(status.ok, false);
  assert.equal(status.tables.sources.ok, true);
  assert.equal(status.tables.runs.ok, true);
  assert.equal(status.tables.signals.ok, false);
  assert.equal(status.tables.signals.code, "PGRST205");
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.options === undefined));
  assert.ok(calls.every((call) => call.columns.includes("id")));
});
