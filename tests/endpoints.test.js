import assert from "node:assert/strict";
import test from "node:test";

import { POST as postRun } from "../app/api/runs/route.js";

test("POST /api/runs rechaza token invalido", async () => {
  process.env.AI_RADAR_API_TOKEN = "valid-token";

  const response = await postRun(
    new Request("http://localhost/api/runs", {
      method: "POST",
      headers: {
        authorization: "Bearer invalid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    }),
  );

  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.error.code, "unauthorized");
});

test("POST /api/runs rechaza payload invalido con token valido", async () => {
  process.env.AI_RADAR_API_TOKEN = "valid-token";

  const response = await postRun(
    new Request("http://localhost/api/runs", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ senales: [] }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error.code, "invalid_payload");
});
