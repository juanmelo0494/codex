import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnv(path = ".env.local") {
  const envPath = resolve(path);
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return { loaded: false, path: envPath };
    }
    throw error;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = unquote(trimmed.slice(separator + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return { loaded: true, path: envPath };
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
