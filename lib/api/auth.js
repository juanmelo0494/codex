import { timingSafeEqual } from "node:crypto";

export function jsonError(status, code, message, details) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export function requireBearerToken(request) {
  const expectedToken = process.env.AI_RADAR_API_TOKEN;
  if (!expectedToken) {
    return {
      ok: false,
      response: jsonError(500, "server_misconfigured", "AI_RADAR_API_TOKEN no esta configurado"),
    };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const receivedToken = match?.[1] ?? "";

  if (!receivedToken || !safeTokenEquals(receivedToken, expectedToken)) {
    return {
      ok: false,
      response: jsonError(401, "unauthorized", "token invalido"),
    };
  }

  return { ok: true };
}

function safeTokenEquals(receivedToken, expectedToken) {
  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);
  if (received.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(received, expected);
}
