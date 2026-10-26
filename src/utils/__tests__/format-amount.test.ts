import { describe, expect, it } from "vitest";
import { formatAmount } from "~/utils";

describe("formatAmount", () => {
    it("formats full amounts by default", () => {
        expect(formatAmount(1_500_000)).toBe("TZS\u00a01,500,000");
    });

    it("abbreviates large amounts when explicitly enabled", () => {
        expect(formatAmount(1_500_000, { showAbbreviation: true })).toBe(
            "TZS\u00a02 M"
        );
    });

    it("formats full amounts without currency by default", () => {
        expect(formatAmount(1_500_000, { showCurrency: false })).toBe(
            "1,500,000"
        );
    });
});
