import { describe, it, expect } from "vitest";
import {
  createUser,
  findUserByFirebaseUid,
  linkOrCreateFirebaseUser,
} from "@/lib/users";

/**
 * Exercises the link-by-email migration logic against the in-memory user store
 * (MONGODB_URI is forced empty in the vitest env). Each test uses unique
 * emails/uids because the in-memory store is a process-global that persists
 * across cases.
 */
describe("linkOrCreateFirebaseUser (in-memory path)", () => {
  it("creates a fresh, password-less account for a new Firebase user", async () => {
    const u = await linkOrCreateFirebaseUser({
      uid: "fb_new_1",
      email: "new1@example.com",
      name: "New One",
    });
    expect(u.firebaseUid).toBe("fb_new_1");
    expect(u.email).toBe("new1@example.com");
    expect(u.name).toBe("New One");
    expect(u.passwordHash).toBe("");
    expect(u.role).toBe("customer");
    expect(u.id).toBeTruthy();
  });

  it("links an existing account by email, preserving its id and role", async () => {
    const legacy = await createUser({
      name: "Legacy Admin",
      email: "legacy@example.com",
      passwordHash: "bcrypt-hash",
      role: "admin",
    });
    const linked = await linkOrCreateFirebaseUser({
      uid: "fb_link_1",
      email: "LEGACY@example.com", // case-insensitive match
      name: "Ignored Name",
    });
    expect(linked.id).toBe(legacy.id); // same underlying account
    expect(linked.role).toBe("admin"); // role preserved, not reset to customer
    expect(linked.firebaseUid).toBe("fb_link_1");
    expect(linked.name).toBe("Legacy Admin"); // existing name kept
  });

  it("is idempotent — the same uid always resolves to the same record", async () => {
    const first = await linkOrCreateFirebaseUser({
      uid: "fb_idem_1",
      email: "idem@example.com",
      name: "Idem",
    });
    const second = await linkOrCreateFirebaseUser({
      uid: "fb_idem_1",
      email: "different@example.com", // different email, same uid
      name: "Changed",
    });
    expect(second.id).toBe(first.id);
    expect(second.email).toBe("idem@example.com"); // resolved by uid, not re-created
  });

  it("findUserByFirebaseUid returns the linked user, or null when unknown", async () => {
    await linkOrCreateFirebaseUser({
      uid: "fb_find_1",
      email: "find@example.com",
      name: "Find",
    });
    const found = await findUserByFirebaseUid("fb_find_1");
    expect(found?.email).toBe("find@example.com");
    expect(await findUserByFirebaseUid("fb_absent")).toBeNull();
    expect(await findUserByFirebaseUid("")).toBeNull();
  });
});
