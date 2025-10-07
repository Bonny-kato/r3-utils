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
import { tryCatch } from "~/utils";

describe("Auth hardening tests", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    afterEach(async () => {
        await mockRedisAdapter.clear();
        vi.restoreAllMocks();
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
            sessionStorage: "test",
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

            console.log("[e]", e);
            expect(resp.headers.get("Location")).toBe(
                "/login?redirectTo=%2Fttl"
            );
            const setCookie = resp.headers.get("Set-Cookie") ?? "";
            expect(/Max-Age=0|Expires=/i.test(setCookie)).toBe(true);
        }
    });

    it("Sliding expiration: requireUserOrRedirect calls resetExpiration", async () => {
        const auth = createMockAuth({ mode: "default" });
        const res = await auth.loginAndRedirect({ id: "slide-1" }, "/");
        const cookie = getSessionCookie(res);

        const spy = vi.spyOn(mockRedisAdapter, "resetExpiration");

        const user = await auth.requireUserOrRedirect(mockRequest("/", cookie));
        console.log("[users]", user);
        expect(spy).toHaveBeenCalledTimes(1);
        expect((spy.mock.calls[0][0] as string).length).toBe(64);
    });

    it("Should maintain the same session ID when updating session data with updateSession", async () => {
        const auth = createMockAuth();

        const loginResponse = await auth.loginAndRedirect(
            { id: "sid-1" },
            "/a"
        );

        const firstCookie = getSessionCookie(loginResponse);
        const firstRequest = mockRequest("/a", firstCookie);

        const updateSessionResponse = await auth.updateSession(
            firstRequest,
            { id: "sid-1", name: "X" },
            "/b"
        );

        const secondCookie = getSessionCookie(updateSessionResponse);
        expect(firstCookie).toBe(secondCookie);

        const secondRequest = mockRequest("/b", secondCookie);

        const [error, user] = await tryCatch(async () => {
            return await auth.requireUserOrRedirect(secondRequest);
        });

        expect(error).toBe(null);
        expect(user).toEqual({ id: "sid-1", name: "X" });
    });

    it("Multiple concurrent sessions for same user are allowed", async () => {
        const auth = createMockAuth();
        const firstLoginResponse = await auth.loginAndRedirect(
            { id: "u-1" },
            "/"
        );
        const firstLoginCookie = getSessionCookie(firstLoginResponse);

        const secondLoginResponse = await auth.loginAndRedirect(
            { id: "u-1" },
            "/"
        );
        const sessionCookie = getSessionCookie(secondLoginResponse);

        const [userAError, userA] = await tryCatch(async () => {
            return await auth.requireUserOrRedirect(
                mockRequest("/", firstLoginCookie)
            );
        });
        const [userBError, userB] = await tryCatch(async () => {
            return await auth.requireUserOrRedirect(
                mockRequest("/", sessionCookie)
            );
        });

        expect(userAError).toBe(null);
        expect(userBError).toBe(null);

        expect(userA?.id).toBe("u-1");
        expect(userB?.id).toBe("u-1");
    });

    it("Shouldn't allow concurrent sessions for the same user", async () => {
        const auth = createMockAuth({
            enableSingleSession: true,
        });

        const user1 = { id: "u-1", name: "Alice" };

        const firstLoginResponse = await auth.loginAndRedirect(user1, "/");
        const firstLoginCookie = getSessionCookie(firstLoginResponse);

        const secondLoginResponse = await auth.loginAndRedirect(user1, "/");
        const secondSessionCookie = getSessionCookie(secondLoginResponse);

        const [firstSessionDataError, firstSessionData] = await tryCatch<
            TestUser,
            Response
        >(async () => {
            return await auth.requireUserOrRedirect(
                mockRequest("/", firstLoginCookie)
            );
        });
        const [secondSessionDataError, secondSessionData] = await tryCatch<
            TestUser,
            Response
        >(async () => {
            return await auth.requireUserOrRedirect(
                mockRequest("/", secondSessionCookie)
            );
        });

        expect(firstSessionDataError).not.toBe(null);
        expect(firstSessionData).toBe(null);
        expect(firstSessionDataError?.status).toBe(HTTP_FOUND);

        expect(secondSessionDataError).toBe(null);
        expect(secondSessionData).toMatchObject(user1);
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

            console.log("[err]", err);
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

    it.skip("getAuthUsers when unauthenticated redirects to login", async () => {
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

    it.skip("getAuthUsers returns collection when multiple users exist", async () => {
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
        const path = "/über space"; // contains Unicode and space
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
            console.log("[e]", e);
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
