import { describe, expect, it } from "vitest";

describe("Cache Build Output", () => {
    it("should export expected cache API from dist", async () => {
        const dist = await import("../../../dist/cache/index.js");

        const expectedExports = [
            "useFetch",
            "useCacheClient",
            "CacheProvider",
            "unwrapNestedPromise",
            "InMemoryCacheAdapter",
            "LocalStorageCacheAdapter",
            "CacheClient",
        ];

        for (const key of expectedExports) {
            expect(key in dist).toBe(true);
        }
    });
});
