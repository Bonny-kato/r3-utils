import { describe, expect, it } from "vitest";
import { parseSearchParams } from "~/utils/query-params-utils";

describe("parseSearchParams", () => {
    it("parses full URL with single values", () => {
        const url = "https://example.com/path?param1=value1&param2=value2";
        const result = parseSearchParams(url);

        expect(result.param1).toBe("value1");
        expect(result.param2).toBe("value2");
    });

    it("parses duplicate keys into arrays", () => {
        const url = "https://example.com/?x=1&x=2&y=a";
        const result = parseSearchParams(url);

        expect(result.x).toEqual(["1", "2"]);
        expect(result.y).toBe("a");
    });

    it("parses raw query string without leading ?", () => {
        const qs = "a=1&b=2";
        const result = parseSearchParams(qs);

        expect(result.a).toBe("1");
        expect(result.b).toBe("2");
    });

    it("returns empty object for empty input", () => {
        const result = parseSearchParams(
            "http://bancassurance.master-portal.local:3000/"
        );
        expect(result).toEqual({});
    });
});
