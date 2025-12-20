import { describe, expect, it } from "vitest";

describe("Utils build output (per-file imports)", () => {
    it("error-utils exports", async () => {
        const mod = await import("../../../dist/utils/error-utils.js");
        expect(mod).toBeDefined();
        expect(typeof mod).toBe("object");
        const expected = ["throwCustomError", "throwError", "safeRedirect"];
        for (const name of expected) expect(name in mod).toBe(true);
    });

    it("check-is-dev-mode exports", async () => {
        const mod = await import("../../../dist/utils/check-is-dev-mode.js");
        expect("checkIsDevMode" in mod).toBe(true);
    });

    it("fake-network exports (allow legacy typo path)", async () => {
        const mod = await import("../../../dist/utils/fake-network.js");
        expect(mod).toBeDefined();
        expect("fakeNetwork" in (mod as Record<string, unknown>)).toBe(true);
    });

    it("action-error exports", async () => {
        const mod = await import("../../../dist/utils/action-error.js");
        expect("actionError" in mod).toBe(true);
    });

    it("conditionally-add-to-array exports", async () => {
        const mod = await import(
            "../../../dist/utils/conditionally-add-to-array.js"
        );
        expect("conditionallyAddToArray" in mod).toBe(true);
    });

    it("env-validator exports", async () => {
        const mod = await import(
            "../../../dist/utils/env-validator/env-validator.js"
        );
        const expected = [
            "createEnvSchema",
            "validateEnv",
            "requiredIn",
            "requiredInDevelopment",
            "requiredInProdAndDev",
            "requiredInProduction",
        ];
        for (const name of expected) expect(name in mod).toBe(true);
    });

    it("format-amount exports", async () => {
        const mod = await import("../../../dist/utils/format-amount.js");
        expect("formatAmount" in mod).toBe(true);
    });

    it("generate-avatar exports", async () => {
        const mod = await import("../../../dist/utils/generate-avatar.js");
        expect("generateAvatar" in mod).toBe(true);
    });

    it("get-duration-from-now exports", async () => {
        const mod = await import(
            "../../../dist/utils/get-duration-from-now.js"
        );
        expect("getDurationFromNow" in mod).toBe(true);
    });

    it("is-not-empty module loads", async () => {
        const mod = await import("../../../dist/utils/is-not-empty.js");
        expect(mod).toBeDefined();
        expect(typeof mod).toBe("object");
        expect(Object.keys(mod).length).toBeGreaterThan(0);
    });

    it("parse-error exports", async () => {
        const mod = await import("../../../dist/utils/parse-error.js");
        const expected = [
            "getErrorMessage",
            "isCustomErrorResponse",
            "parseErrorResponse",
        ];
        for (const name of expected) expect(name in mod).toBe(true);
    });

    it("parse-request-data exports", async () => {
        const mod = await import("../../../dist/utils/parse-request-data.js");
        expect("parseRequestData" in mod).toBe(true);
    });

    it("query-params-utils parseSearchParams exports", async () => {
        const mod = await import(
            "../../../dist/utils/query-params-utils/parseSearchParams.js"
        );
        expect("parseSearchParams" in mod).toBe(true);
    });

    it("query-params-utils serializeQueryParams exports", async () => {
        const mod = await import(
            "../../../dist/utils/query-params-utils/serializeQueryParams.js"
        );
        expect("serializeQueryParams" in mod).toBe(true);
    });

    it("remove-nulish exports", async () => {
        const mod = await import("../../../dist/utils/remove-nulish.js");
        expect("removeNullish" in mod).toBe(true);
    });

    it("try-catch exports", async () => {
        const mod = await import("../../../dist/utils/try-catch.js");
        expect("tryCatch" in mod).toBe(true);
    });

    it("typed-keys exports", async () => {
        const mod = await import("../../../dist/utils/typed-keys.js");
        expect("typedKeys" in mod).toBe(true);
    });
});
