import { describe, expect, it } from "vitest";
import { adminRedirect } from "@/lib/auth/admin-routes";

describe("adminRedirect", () => {
  it("sends anonymous visitors of admin pages to the login page", () => {
    expect(adminRedirect("/admin", false)).toBe("/admin/login");
    expect(adminRedirect("/admin/documents", false)).toBe("/admin/login");
  });

  it("lets anonymous visitors reach the login page", () => {
    expect(adminRedirect("/admin/login", false)).toBeNull();
  });

  it("lets authenticated admins through", () => {
    expect(adminRedirect("/admin", true)).toBeNull();
    expect(adminRedirect("/admin/conversations/abc", true)).toBeNull();
  });

  it("sends authenticated admins away from the login page", () => {
    expect(adminRedirect("/admin/login", true)).toBe("/admin");
  });

  it("does not treat look-alike paths as the login page", () => {
    expect(adminRedirect("/admin/loginx", false)).toBe("/admin/login");
  });
});
