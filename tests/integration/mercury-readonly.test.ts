import { describe, it, expect } from "vitest";
import "dotenv/config";
import { redactSecrets } from "../helpers/redact";

const BASE = "https://api.mercury.com/api/v1";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  } as const;
}

async function mercuryGet(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(token) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mercury ${path} failed: ${res.status} ${res.statusText}; body=${text}`);
  }
  return text ? JSON.parse(text) : null;
}

describe("mercury integration (read-only)", () => {

  if (!token) {
    it.skip("MERCURY_TOKEN is not set (skipping local integration tests)", () => {});
    return;
  }

  it.skipIf(!token)("lists accounts", async () => {
    try {
      const data = await mercuryGet("/accounts", token!);
      expect(data).toBeTruthy();
      // shape is API-defined; just sanity check array-like container
      expect(Array.isArray(data.accounts) || Array.isArray(data)).toBe(true);
    } catch (e) {
      throw new Error(redactSecrets(e, [token]));
    }
  });

  it.skipIf(!token)("lists users", async () => {
    try {
      const data = await mercuryGet("/users", token!);
      expect(data).toBeTruthy();
    } catch (e) {
      throw new Error(redactSecrets(e, [token]));
    }
  });

  it.skipIf(!token)("lists categories", async () => {
    try {
      const data = await mercuryGet("/categories", token!);
      expect(data).toBeTruthy();
    } catch (e) {
      throw new Error(redactSecrets(e, [token]));
    }
  });

  it.skipIf(!token)("gets organization", async () => {
    try {
      const data = await mercuryGet("/organization", token!);
      expect(data).toBeTruthy();
    } catch (e) {
      throw new Error(redactSecrets(e, [token]));
    }
  });
});
