import { describe, expect, it } from "vitest";

import { authenticateStaff } from "./auth";
import type { AppEnv } from "./types";

const selectorEnv = {
  ALLOW_LOCALHOST_AUTH: "false",
  REQUIRE_ACCESS_JWT: "false",
  ALLOWED_STAFF_USERS: "Kevin,Erica,Jenna,Meighan,Emma,Monica",
} as unknown as AppEnv;

describe("staff selector authentication", () => {
  it("accepts a configured staff member and preserves the canonical name", async () => {
    const request = new Request("https://example.test/api/sea/agents", {
      headers: { "X-Staff-User": "kevin" },
    });
    await expect(authenticateStaff(request, selectorEnv)).resolves.toEqual({
      ok: true,
      identity: { email: "kevin@staff-selector.local", displayName: "Kevin" },
    });
  });

  it("requires a selection", async () => {
    const result = await authenticateStaff(new Request("https://example.test/api/sea/agents"), selectorEnv);
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("rejects a name outside the configured list", async () => {
    const request = new Request("https://example.test/api/sea/agents", {
      headers: { "X-Staff-User": "Katie" },
    });
    const result = await authenticateStaff(request, selectorEnv);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});
