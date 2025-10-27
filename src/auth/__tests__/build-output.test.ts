import { describe, expect, it } from "vitest";

// Build output API surface test for auth module

describe("Auth Build Output", () => {
    it("should export expected auth API from dist", async () => {
        const dist = await import("../../../dist/auth/index.js");

        const expectedExports = ["RedisStorageAdapter", "Auth"];

        for (const key of expectedExports) {
            expect(key in dist).toBe(true);
        }
    });
});
