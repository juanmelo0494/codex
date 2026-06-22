#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

import { loadLocalEnv } from "../lib/env.js";
import { checkSupabaseTables, getSupabaseEnvStatus } from "../lib/supabase/diagnostics.js";

loadLocalEnv();

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`uso: node scripts/check_supabase_config.js [--no-network]

Valida que el entorno server-side de Supabase este listo para AI Radar.
No imprime secretos.
`);
  process.exit(0);
}

const env = getSupabaseEnvStatus();
const result = {
  env,
  network_checked: false,
  tables: null,
};

if (env.ok && !args.has("--no-network")) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  result.network_checked = true;
  result.tables = await checkSupabaseTables(supabase);
}

console.log(JSON.stringify(result, null, 2));

if (!env.ok || (result.tables && !result.tables.ok)) {
  process.exit(1);
}
