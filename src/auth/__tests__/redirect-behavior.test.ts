import { describe, expect, it } from "vitest";
import {
    $cookie,
    createMockAuth,
    getLocation,
    getSessionCookie,
    mockRedisAdapter,
    mockRequest,
    TestUser,
} from "~/auth/auth-test-utils";
import { HTTP_FOUND } from "~/http-client";
import { tryCatch } from "~/utils";

describe("Auth: Redirect Behavior", () => {
    it("should redirect user to the  page if invalid redirect url is provided", async () => {
        const auth = createMockAuth();

        const loginResponse = await auth.loginAndRedirect(
            { id: "u6" },
            "//user home"
        );

        expect(getLocation(loginResponse)).toBe("/");
    });

    it("should normalize invalid redirect url to '/'", async () => {
        const auth = createMockAuth();
        const badUrls = [
            "http://evil.com",
            "https://evil.com",
            "//evil.com",
            "   http://evil.com",
            "%2F%2Fevil.com",
        ];

        for (const to of badUrls) {
            const res = await auth.loginAndRedirect({ id: "r1" }, to);
            expect(getLocation(res)).toBe("/");
        }
    });

    it("should encode internationalized redirectTo correctly in login redirect", async () => {
        const auth = createMockAuth();
        const path = "/über space"; // contains Unicode and space

        const [redirectError, user] = await tryCatch<TestUser, Response>(
            async () => {
                return await auth.requireUserOrRedirect(mockRequest(path));
            }
        );

        expect(user).toBe(null);
        expect(redirectError?.headers.get("Location")).toBe(
            "/login?redirectTo=%2F%25C3%25BCber%2520space"
        );
    });

    it("should redirect user to the login page when user data is not presented in db with 'in-custom-db' storage type", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect({ id: "u7" }, "/home");
        const cookie = getSessionCookie(res);

        const sessionId = await $cookie.parse(cookie);
        await mockRedisAdapter.remove(sessionId);

        const [redirectError, _user] = await tryCatch<TestUser, Response>(
            async () => {
                return await auth.requireUserOrRedirect(
                    mockRequest("/private", cookie)
                );
            }
        );
        expect(_user).toBe(null);
        expect(redirectError?.status).toBe(HTTP_FOUND);
        expect(getLocation(redirectError)).toBe("/login?redirectTo=%2Fprivate");
    });

    it("should redirect to login page when unauthenticated", async () => {
        const auth = createMockAuth();

        const [redirectError, _user] = await tryCatch<TestUser, Response>(
            async () => {
                return await auth.requireUserOrRedirect(
                    mockRequest("/private")
                );
            }
        );

        expect(_user).toBe(null);
        expect(redirectError?.status).toBe(HTTP_FOUND);
        expect(getLocation(redirectError)).toBe("/login?redirectTo=%2Fprivate");
    });
});
