import { describe, expect, it } from "vitest";

describe("Access Control Build Output", () => {
    it("should export expected access-control API from dist", async () => {
        const dist = await import("../../../dist/access-control/index.js");

        const expectedExports = [
            "AccessControl",
            "AccessControlProvider",
            "checkAccess",
            "generateMenuAccess",
            "generateUserAccessControlConfig",
            "hasAttribute",
            "hasPermission",
            "hasRole",
            "requireAccess",
            "useAccessControl",
            "useHasAccess",
        ];

        for (const key of expectedExports) {
            expect(key in dist).toBe(true);
        }
    });
});
