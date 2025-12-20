import { describe, expect, it } from "vitest";

// Build output API surface test for hooks module

describe("Hooks Build Output", () => {
    it("should export expected hooks API from dist", async () => {
        const dist = await import("../../../dist/hooks/index.js");

        const expectedExports = [
            // Event handling
            "useEventListener",
            // Navigation and routing
            "useBreadcrumb",
            "useIsPathActive",
            "useLocationState",
            "useNavigateWithQueryParams",
            "LinkWithQueryParams",
            "useNavigationState",
            // UI and interaction
            "useDebounce",
            "useScroll",
            "useSearchParamsState",
            // Data handling
            "useHandleSelectAllItems",
            "useHandleSelectItem",
            "useSubmitData",
            "useUploadFile",
        ];

        for (const key of expectedExports) {
            expect(key in dist).toBe(true);
        }
    });
});
