import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Auth, MemoryStorageAdapter } from "~/auth";
import {
    createMockAuth,
    DataWithResponseInit,
    getLocation,
    getSessionCookie,
    mockRedisAdapter,
    mockRequest,
} from "~/auth/__tests__/auth-test-utils";
import { TestUser } from "~/auth/__tests__/auth.test";

import {
    HTTP_FOUND,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_UNAUTHORIZED,
} from "~/http-client/status-code";

describe("Auth hardening tests", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    afterEach(async () => {
        await mockRedisAdapter.clear();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("Cookie tampering: malformed cookie value triggers login redirect and clears cookie", async () => {
        const auth = createMockAuth();

        // Tampered cookie (invalid value)
        const tampered = "__test_session=abc.def.ghi";
        try {
            await auth.requireUserOrRedirect(
                mockRequest("/protected", tampered)
            );
            expect.unreachable("Expected redirect due to invalid cookie");
        } catch (e) {
            const resp = e as Response;
            expect(resp).toBeInstanceOf(Response);

            expect(getLocation(resp)).toBe("/login?redirectTo=%2Fprotected");
            const setCookie = getSessionCookie(resp) ?? "";
            expect(setCookie).toContain("__test_session=");
        }
    });

    it("Wrong cookie name is ignored", async () => {
        const auth = createMockAuth();
        try {
            await auth.requireUserOrRedirect(
                mockRequest("/private", "another_cookie=foo")
            );
            expect.unreachable("Expected redirect due to missing valid cookie");
        } catch (e) {
            const resp = e as Response;
            expect(resp.headers.get("Location")).toBe(
                "/login?redirectTo=%2Fprivate"
            );
        }
    });

    it("TTL expiration: expired user causes redirect and cookie cleared (Memory adapter)", async () => {
        const memoryAdapter = new MemoryStorageAdapter<TestUser>(
            "auth_users_ttl",
            { ttlSeconds: 1 }
        );
        const auth = new Auth<TestUser, "test">({
            cookie: { name: "__test_session", secrets: ["my-secret"] },
            storageAdapter: memoryAdapter,
            mode: "test",
        });

        const res = await auth.loginAndRedirect({ id: "ttl-1" }, "/ttl");
        const cookie = getSessionCookie(res);

        // Advance time to force expiration
        vi.useFakeTimers();
        vi.setSystemTime(Date.now() + 3000);

        try {
            await auth.requireUserOrRedirect(mockRequest("/ttl", cookie));

            expect.unreachable("Expected redirect due to expired session");
        } catch (e) {
            const resp = e as Response;
            expect(resp.headers.get("Location")).toBe(
                "/login?redirectTo=%2Fttl"
            );
            const setCookie = resp.headers.get("Set-Cookie") ?? "";
            expect(/Max-Age=0|Expires=/i.test(setCookie)).toBe(true);
        }
    });

    it("Sliding expiration: requireUserOrRedirect calls resetExpiration", async () => {
        const auth = createMockAuth();
        const res = await auth.loginAndRedirect({ id: "slide-1" }, "/");
        const cookie = getSessionCookie(res);

        const spy = vi.spyOn(mockRedisAdapter, "resetExpiration");

        await auth.requireUserOrRedirect(mockRequest("/", cookie));
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith("slide-1");
    });

    it("Session rotation: updateSessionAndRedirect issues a new session id", async () => {
        const auth = createMockAuth();
        const r1 = await auth.loginAndRedirect({ id: "sid-1" }, "/a");
        const c1 = getSessionCookie(r1);
        const req1 = mockRequest("/a", c1);

        const r2 = await auth.updateSession(
            req1,
            { id: "sid-1", name: "X" },
            "/b"
        );
        const c2 = getSessionCookie(r2);
        expect(c1).not.toBe(c2);
    });

    it("CSRF flags: Set-Cookie has HttpOnly, SameSite=Lax, Secure in non-test mode", async () => {
        const auth = new Auth<TestUser, "default">({
            cookie: { name: "__prod_session", secrets: ["my-secret"] },
            storageAdapter: mockRedisAdapter,
            mode: "default",
        });
        const res = await auth.loginAndRedirect({ id: "csrf-1" }, "/home");
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie).toMatch(/HttpOnly/i);
        expect(setCookie).toMatch(/SameSite=Lax/i);
        expect(setCookie).toMatch(/Secure/i);
    });

    it("Multiple concurrent sessions for same user are allowed", async () => {
        const auth = createMockAuth();
        const a = await auth.loginAndRedirect({ id: "u-1" }, "/");
        const cookieA = getSessionCookie(a);

        const b = await auth.loginAndRedirect({ id: "u-1" }, "/");
        const cookieB = getSessionCookie(b);

        const userA = await auth.requireUserOrRedirect(
            mockRequest("/", cookieA)
        );
        const userB = await auth.requireUserOrRedirect(
            mockRequest("/", cookieB)
        );
        expect(userA?.id).toBe("u-1");
        expect(userB?.id).toBe("u-1");
    });

    it("Adapter error paths: get/set/remove throw -> 500 error via data()", async () => {
        const auth = createMockAuth();

        // set error on login
        const setSpy = vi
            .spyOn(mockRedisAdapter, "set")
            .mockResolvedValue([new Error("Unable to store auth user"), null]);
        try {
            await auth.loginAndRedirect({ id: "e1" }, "/");
            expect.unreachable("Expected set error");
        } catch (e) {
            const err = e as DataWithResponseInit;
            expect(err.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect(err.data).toBe("Unable to store auth user");
        } finally {
            setSpy.mockRestore();
        }

        // get error on requireUserOrRedirect
        const res = await auth.loginAndRedirect({ id: "e2" }, "/");
        const cookie = getSessionCookie(res);
        const getSpy = vi
            .spyOn(mockRedisAdapter, "get")
            .mockResolvedValue([new Error("boom"), null]);
        try {
            await auth.requireUserOrRedirect(mockRequest("/", cookie));
            expect.unreachable("Expected get error");
        } catch (e) {
            const err = e as DataWithResponseInit;
            expect(err.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect(err.data).toBe("boom");
        } finally {
            getSpy.mockRestore();
        }

        // remove error on logout
        const res2 = await auth.loginAndRedirect({ id: "e3" }, "/");
        const cookie2 = getSessionCookie(res2);
        const removeSpy = vi
            .spyOn(mockRedisAdapter, "remove")
            .mockResolvedValue([new Error("nope"), null]);
        try {
            await auth.logoutAndRedirect(mockRequest("/", cookie2));
            expect.unreachable("Expected remove error");
        } catch (e) {
            const err = e as DataWithResponseInit;
            expect(err.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect(err.data).toBe("nope");
        } finally {
            removeSpy.mockRestore();
        }
    });

    it("Redirect hardening: external and weird URLs are normalized to '/'", async () => {
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

    it("Redirect with very long path does not crash", async () => {
        const auth = createMockAuth();
        const longPath = "/" + "a".repeat(5000);
        const res = await auth.loginAndRedirect({ id: "long" }, longPath);
        expect(getLocation(res)).toBe(longPath);
    });

    it("Access token: empty string invalid, whitespace string returned as-is", async () => {
        const auth = createMockAuth();
        // Empty string -> invalid
        const r1 = await auth.loginAndRedirect({ id: "t1", token: "" }, "/");
        const c1 = getSessionCookie(r1);
        try {
            await auth.requireAccessToken(mockRequest("/", c1));
            expect.unreachable("Expected 401 for empty token");
        } catch (e) {
            const err = e as DataWithResponseInit;
            expect(err.init?.status).toBe(HTTP_UNAUTHORIZED);
        }

        const r2 = await auth.updateSession(
            mockRequest("/", c1),
            { id: "t1", token: " " },
            "/"
        );
        const c2 = getSessionCookie(r2);
        await expect(
            auth.requireAccessToken(mockRequest("/", c2))
        ).resolves.toBe(" ");
    });

    it("getAuthUsers when unauthenticated redirects to login", async () => {
        const auth = createMockAuth();
        try {
            await auth.getAuthUsers(mockRequest("/admin"));
            expect.unreachable("Expected redirect");
        } catch (e) {
            const resp = e as Response;
            expect(resp.headers.get("Location")).toBe(
                "/login?redirectTo=%2Fadmin"
            );
        }
    });

    it("getAuthUsers returns collection when multiple users exist", async () => {
        const auth = createMockAuth();
        const r1 = await auth.loginAndRedirect({ id: "m1" }, "/");
        const c1 = getSessionCookie(r1);
        await auth.loginAndRedirect({ id: "m2" }, "/");

        const users = (await auth.getAuthUsers(
            mockRequest("/", c1)
        )) as TestUser[];
        expect(Array.isArray(users)).toBe(true);
        expect(users.some((u) => u.id === "m1")).toBe(true);
        expect(users.some((u) => u.id === "m2")).toBe(true);
    });

    it("Logout robustness: missing/invalid cookie still redirects and sets expiry", async () => {
        const auth = createMockAuth();
        const res = await auth.logoutAndRedirect(mockRequest("/no-cookie"));
        expect(getLocation(res)).toBe("/login");
        const setCookie = res.headers.get("Set-Cookie") ?? "";
        expect(/Max-Age=0|Expires=/i.test(setCookie)).toBe(true);
    });

    it("Internationalized redirectTo is correctly encoded in login redirect", async () => {
        const auth = createMockAuth();
        const path = "/über space"; // contains unicode and space
        try {
            await auth.requireUserOrRedirect(mockRequest(path));
            expect.unreachable("Expected redirect");
        } catch (e) {
            const resp = e as Response;
            expect(resp.headers.get("Location")).toBe(
                "/login?redirectTo=%2F%25C3%25BCber%2520space"
            );
        }
    });

    it("Redirect status is consistent (302) for GET and POST", async () => {
        const auth = createMockAuth();
        try {
            await auth.requireUserOrRedirect(
                mockRequest("/g", undefined, "GET")
            );
            expect.unreachable("Expected GET redirect");
        } catch (e) {
            expect((e as Response).status).toBe(302);
        }
        try {
            await auth.requireUserOrRedirect(
                mockRequest("/p", undefined, "POST")
            );
            expect.unreachable("Expected POST redirect");
        } catch (e) {
            expect((e as Response).status).toBe(302);
        }
    });

    it("should login user event if there is no data in db", async () => {
        await mockRedisAdapter.clear();

        const auth = createMockAuth();
        const res = await auth.loginAndRedirect(
            { id: "u1", name: "Alice" },
            "/dashboard"
        );

        expect(res.status).toBe(HTTP_FOUND);
        expect(getLocation(res)).toBe("/dashboard");
    });
});
