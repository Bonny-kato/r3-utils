import { describe, expect, it } from "vitest";
import { serializeQueryParams } from "~/utils/query-params-utils";

describe("serializeQueryParams", () => {
    it("serializes primitive values and omits null/undefined", () => {
        const qs = serializeQueryParams({
            page: 1,
            q: "search",
            active: false,
            skip: undefined,
            // @ts-expect-error: runtime can pass null
            empty: null,
        });

        const params = new URLSearchParams(qs);

        expect(params.get("page")).toBe("1");
        expect(params.get("q")).toBe("search");
        expect(params.get("active")).toBe("false");
        expect(params.has("skip")).toBe(false);
        expect(params.has("empty")).toBe(false);
    });

    it("serializes array values as repeated keys", () => {
        const qs = serializeQueryParams({
            tags: ["a", "b"],
            ids: [1, 2],
        });

        const params = new URLSearchParams(qs);
        const tags = params.getAll("tags");
        const ids = params.getAll("ids");

        expect(tags).toEqual(["a", "b"]);
        expect(ids).toEqual(["1", "2"]);
    });

    it("returns empty string for empty input", () => {
        expect(serializeQueryParams({})).toBe("");
        // undefined input is allowed (optional param)
        expect(serializeQueryParams(undefined)).toBe("");
    });
});
