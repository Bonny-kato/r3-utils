import { describe, expect, it } from "vitest";
import {
    createMockAuth,
    getLocation,
    getSessionCookie,
    mockRequest,
    TestUser,
} from "~/auth/auth-test-utils";
import { tryCatch } from "~/utils";

describe("Auth: Cookie Handling", () => {
    it("Cookie tampering: malformed cookie value triggers login redirect and clears cookie", async () => {
        const auth = createMockAuth();

        // Tampered cookie (invalid value)
        const tampered = "__test_session=abc.def.ghi";

        const [requireUserError, user] = await tryCatch<TestUser, Response>(
            async () => {
                return await auth.requireUserOrRedirect(
                    mockRequest("/protected", tampered)
                );
            }
        );

        expect(user).toBe(null);
        expect(requireUserError).toBeInstanceOf(Response);

        expect(getLocation(requireUserError)).toBe(
            "/login?redirectTo=%2Fprotected"
        );
        expect(getSessionCookie(requireUserError as Response)).toContain(
            "__test_session="
        );
    });

    it("Wrong cookie name is ignored", async () => {
        const auth = createMockAuth();

        const [requireUserError, user] = await tryCatch<TestUser, Response>(
            async () => {
                return await auth.requireUserOrRedirect(
                    mockRequest("/private", "another_cookie=foo")
                );
            }
        );

        expect(user).toBe(null);
        expect(getLocation(requireUserError)).toBe(
            "/login?redirectTo=%2Fprivate"
        );
    });
});
