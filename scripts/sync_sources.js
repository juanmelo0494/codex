#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadLocalEnv } from "../lib/env.js";

loadLocalEnv();

const sourcePath = resolve(process.argv[2] ?? "config/sources.json");
const apiBaseUrl = (process.env.AI_RADAR_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const token = process.env.AI_RADAR_API_TOKEN;

if (!token) {
  console.error("error: AI_RADAR_API_TOKEN es requerido");
  process.exit(1);
}

const payload = JSON.parse(await readFile(sourcePath, "utf8"));
const response = await fetch(`${apiBaseUrl}/api/sources/sync`, {
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
