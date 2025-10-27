import { describe, expect, it } from "vitest";

// Build output API surface test for zod-common module

describe("Zod Common Build Output", () => {
    it("should export expected zod-common API from dist", async () => {
        const dist = await import("../../../dist/zod-common/index.js");

        const expectedExports = [
            "PaginationSchema",
            "createOptionalRefinement",
            "ApiListSchema",
            "ApiDetailsSchema",
            "ContainOnlyAlphabetic",
            "SelectOptionSchema",
            "NoneEmptyStringSchema",
            "TanzaniaMobileNumberSchema",
            "OptionalEmailSchema",
            "PositiveNumberSchema",
            "LabelAndValueSchema",
            "AtLeastOneArrayItemSchema",
        ];

        for (const key of expectedExports) {
            expect(key in dist).toBe(true);
        }
    });

    it("should validate pagination schema", async () => {
        const { PaginationSchema } = await import(
            "../../../dist/zod-common/index.js"
        );

        const parsed = PaginationSchema.parse({
            currentPage: 1,
            totalPages: 10,
        });
        expect(parsed).toEqual({ currentPage: 1, totalPages: 10 });
    });
});
