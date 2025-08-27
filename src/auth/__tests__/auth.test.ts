import { data } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Auth } from "~/auth";
import {
    createMockAuth,
    getSessionCookie,
    mockRedisAdapter,
    mockRequest,
} from "~/auth/__tests__/auth-test-utils";

import { authUserTestData } from "~/auth/__tests__/auth-test-data";
import {
    HTTP_FOUND,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_MOVED_PERMANENTLY,
    HTTP_MULTIPLE_CHOICES,
    HTTP_NOT_MODIFIED,
    HTTP_PERMANENT_REDIRECT,
    HTTP_SEE_OTHER,
    HTTP_TEMPORARY_REDIRECT,
    HTTP_UNAUTHORIZED,
    HTTP_USE_PROXY,
} from "~/http-client/status-code";

export interface TestUser {
    id: string;
    name?: string;
    token?: string;
}

type DataWithResponseInit<TData = unknown> = ReturnType<typeof data<TData>>;

const REDIRECT_STATUS_CODES = [
    HTTP_MULTIPLE_CHOICES,
    HTTP_MOVED_PERMANENTLY,
    HTTP_FOUND,
    HTTP_SEE_OTHER,
    HTTP_NOT_MODIFIED,
    HTTP_USE_PROXY,
    HTTP_TEMPORARY_REDIRECT,
    HTTP_PERMANENT_REDIRECT,
];

const extractCookiePair = (setCookie: string | null) => {
    if (!setCookie) return "";
    // Return only the first "name=value" pair for Cookie header
    return setCookie.split(";")[0];
};

const makeRequest = (url: string, cookie?: string) =>
    new Request(`http://localhost${url}`, {
        headers: cookie ? { Cookie: cookie } : undefined,
    });

// Helper to read Location header from a redirect/error Response
const getLocation = (res: Response) => res.headers.get("Location");

describe("Auth (mode=test)", () => {
    afterEach(() => {
        mockRedisAdapter.clear();
    });

    it("constructor should throw when cookie.name is missing", () => {
        const create = () =>
            // @ts-expect-error intentionally missing cookie name
            new Auth<TestUser, "test">({ cookie: {}, mode: "test" });

        try {
            create();
            expect.unreachable("Expected constructor to throw");
        } catch (e: unknown) {
            // throwError uses react-router's data(), which throws a DataWithResponseInit-like object
            const err = e as DataWithResponseInit;

            expect.soft(typeof err).toBe("object");
            expect.soft(err?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect(err.data).toBe("Cookie name is required");
        }
    });

    it("loginAndRedirect should set cookie and allow retrieving the user", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect(authUserTestData, "/dashboard");
        expect(REDIRECT_STATUS_CODES.includes(res.status)).toBe(true);
        expect(getLocation(res)).toBe("/dashboard");

        const cookie = extractCookiePair(res.headers.get("set-cookie"));
        expect(cookie).toContain("__test_session=");

        const req = makeRequest("/dashboard", cookie);
        const user = await auth.requireUserOrRedirect(req);
        expect(user).toMatchObject(authUserTestData);
    });

    it("getUserId should return null when unauthenticated and id when authenticated", async () => {
        const auth = createMockAuth();

        const reqNoCookie = makeRequest("/private");
        await expect(auth.getUserId(reqNoCookie)).resolves.toBeNull();

        const res = await auth.loginAndRedirect({ id: "u2" }, "/home");
        const cookie = extractCookiePair(res.headers.get("set-cookie"));
        const req = makeRequest("/home", cookie);

        await expect(auth.getUserId(req)).resolves.toBe("u2");
    });

    it("requireUserOrRedirect should redirect when unauthenticated", async () => {
        const auth = createMockAuth();

        const req = makeRequest("/private");
        const consoleWarn = vi.spyOn(console, "warn");

        // Function throws a redirect Response; catch and assert
        try {
            await auth.requireUserOrRedirect(req);
            expect.unreachable("Expected redirect to be thrown");
        } catch (e: unknown) {
            expect(consoleWarn).toHaveBeenCalledTimes(1);
            expect(consoleWarn).toBeCalledWith("User Id is missing");

            expect(e).toBeInstanceOf(Response);
            const resp = e as Response;
            expect(REDIRECT_STATUS_CODES.includes(resp.status)).toBe(true);
            expect(getLocation(resp)).toBe("/login?redirectTo=%2Fprivate");
        }
    });

    it("requireAccessToken should return token for valid user and throw 401 if missing", async () => {
        const auth = createMockAuth();

        // With token
        const res = await auth.loginAndRedirect(
            { id: "u3", token: "abc" },
            "/"
        );
        const cookie = extractCookiePair(res.headers.get("set-cookie"));
        const req = makeRequest("/", cookie);

        await expect(auth.requireAccessToken(req)).resolves.toBe("abc");

        // Without token -> new login for a user without token
        const res2 = await auth.updateSession(req, { id: "u4" }, "/");
        const cookie2 = extractCookiePair(res2.headers.get("set-cookie"));
        const req2 = makeRequest("/", cookie2);

        try {
            await auth.requireAccessToken(req2);
            expect.unreachable("Expected 401 error to be thrown");
        } catch (e: unknown) {
            const err = e as DataWithResponseInit;

            expect.soft(typeof err).toBe("object");
            expect
                .soft(err.data)
                .toBe("Authenticated user lacks the required token property");

            expect(err.init?.status).toBe(HTTP_UNAUTHORIZED);
        }
    });

    it("updateSessionAndRedirect should update stored user and issue a new session cookie", async () => {
        const auth = createMockAuth();

        const loginRes = await auth.loginAndRedirect(
            { id: "u5", name: "A" },
            "/start"
        );
        const cookie1 = extractCookiePair(loginRes.headers.get("set-cookie"));
        const req1 = makeRequest("/start", cookie1);

        const updateRes = await auth.updateSession(
            req1,
            { id: "u5", name: "Alice" },
            "/updated"
        );
        expect(getLocation(updateRes)).toBe("/updated");

        const cookie2 = extractCookiePair(updateRes.headers.get("set-cookie"));
        const req2 = makeRequest("/updated", cookie2);
        const user = await auth.requireUserOrRedirect(req2);

        const authUsers = await auth.getAuthUsers(req2);

        expect.soft(authUsers).not.toBe(null);
        expect.soft(authUsers?.length).toBe(1);
        expect(user).toMatchObject({ id: "u5", name: "Alice" });
    });

    it("logoutAndRedirect should clear session and redirect to login by default", async () => {
        const auth = createMockAuth();

        const loginRes = await auth.loginAndRedirect({ id: "u6" }, "/home");
        const cookie = extractCookiePair(loginRes.headers.get("set-cookie"));

        const req = makeRequest("/home", cookie);
        const res = await auth.logoutAndRedirect(req);

        expect(REDIRECT_STATUS_CODES.includes(res.status)).toBe(true);
        expect(getLocation(res)).toBe("/login");

        // After logout, the requiring user should redirect again
        try {
            await auth.requireUserOrRedirect(makeRequest("/home"));
            expect.unreachable("Expected redirect after logout");
        } catch (e: unknown) {
            expect(e).toBeInstanceOf(Response);
            expect((e as Response).headers.get("Location")).toBe(
                "/login?redirectTo=%2Fhome"
            );
        }
    });

    it("getAuthUsers should return list of users when authenticated", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect({ id: "u7", name: "Bob" }, "/");
        const cookie = extractCookiePair(res.headers.get("set-cookie"));
        const req = makeRequest("/", cookie);

        const users = (await auth.getAuthUsers(req)) as TestUser[];
        expect(Array.isArray(users)).toBe(true);
        expect(users.some((u) => u.id === "u7")).toBe(true);
    });

    it("should redirect user to the  page if invalid redirect url is provided", async () => {
        const auth = createMockAuth();
        const loginResponse = await auth.loginAndRedirect(
            {
                id: "u6",
            },
            "//user home"
        );

        expect(getLocation(loginResponse)).toBe("/");
    });

    it("should clear session when  user does nots found in storage or manually removed from storage", async () => {
        const auth = createMockAuth({
            storageAdapter: mockRedisAdapter,
        });
        const loginRes = await auth.loginAndRedirect(
            {
                id: "u6",
            },
            "//user home"
        );

        await mockRedisAdapter.remove("u6");

        try {
            const cookie = extractCookiePair(
                loginRes.headers.get("set-cookie")
            );
            const req = makeRequest("/private", cookie);

            await auth.requireUserOrRedirect(req);
            expect.unreachable(
                "Expect to throw redirection since user it not presented in storage or manually removed from storage"
            );
        } catch (e) {
            const responseError = e as Response;

            expect.soft(responseError).toBeInstanceOf(Response);
            expect(REDIRECT_STATUS_CODES.includes(responseError.status)).toBe(
                true
            );

            expect((e as Response).headers.get("Location")).toBe(
                "/login?redirectTo=%2Fprivate"
            );
        }
    });

    it("should override user data when user id is the same  and try to login again with different data", async () => {
        const auth = createMockAuth();

        const initialLoginRes = await auth.loginAndRedirect(
            { id: "u1", name: "Initial" },
            "/home"
        );
        const initialCookie = extractCookiePair(
            initialLoginRes.headers.get("set-cookie")
        );
        const initialReq = makeRequest("/home", initialCookie);
        const initialUser = await auth.requireUserOrRedirect(initialReq);

        expect(initialUser).toMatchObject({ id: "u1", name: "Initial" });

        const secondLoginRes = await auth.loginAndRedirect(
            { id: "u1", name: "Updated" },
            "/home"
        );
        const updatedCookie = extractCookiePair(
            secondLoginRes.headers.get("set-cookie")
        );
        const updatedReq = makeRequest("/home", updatedCookie);
        const updatedUser = await auth.requireUserOrRedirect(updatedReq);

        const authUsers = await auth.getAuthUsers(updatedReq);

        expect.soft(authUsers).not.toBe(null);
        expect.soft(authUsers?.length).toBe(1);
        expect(updatedUser).toMatchObject({ id: "u1", name: "Updated" });
    });

    it("should update session and redirect to the provided url", async () => {
        const initialUser = { id: "u1", name: "Initial" };

        const updatedAuthUser = {
            ...initialUser,
            newProp: "newProp",
        };

        const auth = createMockAuth();

        const initialLoginRes = await auth.loginAndRedirect(
            initialUser,
            "/home"
        );
        const initialCookie = extractCookiePair(
            initialLoginRes.headers.get("set-cookie")
        );
        const request = mockRequest("/home", initialCookie);

        const response = await auth.updateSession(
            request,
            updatedAuthUser,
            "/home"
        );
        const cookies = getSessionCookie(response);

        const request2 = mockRequest("/home", cookies);

        expect(getLocation(response)).toBe("/home");

        const user = await auth.requireUserOrRedirect(request2);

        expect(user).not.toEqual(initialUser);
    });
});
