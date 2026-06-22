import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadLocalEnv } from "../lib/env.js";

test("carga .env.local sin sobrescribir variables existentes", async () => {
  const previous = process.env.AI_RADAR_TEST_ENV;
  const dir = await mkdtemp(join(tmpdir(), "airadar-env-"));
  const envPath = join(dir, ".env.local");
  process.env.AI_RADAR_TEST_ENV = "existing";

  try {
    await writeFile(
      envPath,
      [
        "# comentario",
        "AI_RADAR_TEST_ENV=from-file",
        "AI_RADAR_TEST_NEW=value",
        "AI_RADAR_TEST_QUOTED=\"quoted value\"",
      ].join("\n"),
      "utf8",
    );

    const result = loadLocalEnv(envPath);

    assert.equal(result.loaded, true);
    assert.equal(process.env.AI_RADAR_TEST_ENV, "existing");
    assert.equal(process.env.AI_RADAR_TEST_NEW, "value");
    assert.equal(process.env.AI_RADAR_TEST_QUOTED, "quoted value");
  } finally {
    if (previous === undefined) {
      delete process.env.AI_RADAR_TEST_ENV;
    } else {
      process.env.AI_RADAR_TEST_ENV = previous;
    }
    delete process.env.AI_RADAR_TEST_NEW;
    delete process.env.AI_RADAR_TEST_QUOTED;
    await rm(dir, { recursive: true, force: true });
  }
});
