#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadLocalEnv } from "../lib/env.js";

loadLocalEnv();

const snapshotPath = resolve(process.argv[2] ?? "");
const apiBaseUrl = (process.env.AI_RADAR_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const token = process.env.AI_RADAR_API_TOKEN;

if (!process.argv[2]) {
  console.error("uso: node scripts/persist_daily_snapshot.js data/daily/YYYY-MM-DD.json");
  process.exit(1);
}

if (!token) {
  console.error("error: AI_RADAR_API_TOKEN es requerido");
  process.exit(1);
}

const payload = JSON.parse(await readFile(snapshotPath, "utf8"));
const response = await fetch(`${apiBaseUrl}/api/runs`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(payload),
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));

if (!response.ok) {
  process.exit(1);
}
