import { describe, expect, it } from "vitest";
import { Auth } from "~/auth";
import {
    authUserTestData,
    createMockAuth,
    getLocation,
    getSessionCookie,
    mockRequest,
    TestUser,
} from "~/auth/auth-test-utils";
import { HTTP_FOUND } from "~/http-client/status-code";
import { tryCatch } from "~/utils";

describe("`Auth: Authentication Flow", () => {
    it("should set cookie and allow retrieving the user after login", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect(authUserTestData, "/dashboard");
        expect(res.status).toBe(HTTP_FOUND);
        expect(getLocation(res)).toBe("/dashboard");

        const cookie = getSessionCookie(res);
        expect(cookie).toContain("__test_session=");

        const req = mockRequest("/dashboard", cookie);

        const [error, user] = await tryCatch(async () => {
            return await auth.requireUserOrRedirect(req);
        });

        expect(error).toBe(null);
        expect(user).toMatchObject(authUserTestData);
    });

    it("should return false for unauthenticated requests", async () => {
        const auth = createMockAuth();

        const reqNoCookie = mockRequest("/private");
        await expect(auth.isAuthenticated(reqNoCookie)).resolves.toBe(false);
    });
    it("should return true for authenticated requests", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect({ id: "u2" }, "/home");
        const cookie = getSessionCookie(res);
        const req = mockRequest("/private", cookie);

        await expect(auth.isAuthenticated(req)).resolves.toBe(true);
    });

    it("should clear the session and redirect to the specified login URL upon logout", async () => {
        const auth = createMockAuth();

        const loginRes = await auth.loginAndRedirect({ id: "u6" }, "/home");
        const cookie = getSessionCookie(loginRes);

        const req = mockRequest("/home", cookie);
        const res = await auth.logoutAndRedirect(req);

        expect(res.status).toBe(HTTP_FOUND);
        expect(getLocation(res)).toBe("/login");

        const [error, user] = await tryCatch<TestUser, Response>(async () => {
            return await auth.requireUserOrRedirect(req);
        });

        expect(error).toBeInstanceOf(Response);
        expect(user).toBe(null);
        expect(error?.headers.get("Location")).toBe(
            "/login?redirectTo=%2Fhome"
        );
    });

    it("should allow users to login and access protected resources with `in-cookie-only` storage type", async () => {
        const auth = new Auth({
            cookie: {
                name: "__test_session",
                secrets: ["checked"],
            },
            sessionStorageType: "in-memory",
        });

        const res = await auth.loginAndRedirect({ id: "u1" }, "/home");
        const cookie = getSessionCookie(res);

        const [requireUserError, user] = await tryCatch(async () => {
            return await auth.requireUserOrRedirect(
                mockRequest("/private", cookie)
            );
        });

        expect(requireUserError).toBe(null);
        expect(user).toMatchObject({ id: "u1" });
    });
});
