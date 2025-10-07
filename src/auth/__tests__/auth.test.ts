import { data } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Auth, MemoryStorageAdapter } from "~/auth";
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
    HTTP_USE_PROXY,
} from "~/http-client/status-code";
import { tryCatch } from "~/utils";

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
            new Auth<TestUser, "test">({ cookie: {}, sessionStorage: "test" });

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

    it("isAuthenticated should return false when user is unauthenticated else true", async () => {
        const auth = createMockAuth();

        const reqNoCookie = makeRequest("/private");
        await expect(auth.isAuthenticated(reqNoCookie)).resolves.toBe(false);

        const res = await auth.loginAndRedirect({ id: "u2" }, "/home");
        const cookie = extractCookiePair(res.headers.get("set-cookie"));
        const req = makeRequest("/home", cookie);

        await expect(auth.isAuthenticated(req)).resolves.toBe(true);
    });

    it("requireUserOrRedirect should redirect when unauthenticated", async () => {
        const auth = createMockAuth();

        const req = makeRequest("/private");

        // Function throws a redirect Response; catch and assert
        try {
            await auth.requireUserOrRedirect(req);
            expect.unreachable("Expected redirect to be thrown");
        } catch (e: unknown) {
            expect(e).toBeInstanceOf(Response);
            const resp = e as Response;
            expect(REDIRECT_STATUS_CODES.includes(resp.status)).toBe(true);
            expect(getLocation(resp)).toBe("/login?redirectTo=%2Fprivate");
        }
    });

    it.todo(
        "updateSessionAndRedirect should update stored user and issue a new session cookie",
        async () => {
            const storageAdapter = new MemoryStorageAdapter<TestUser>("users");
            const auth = createMockAuth({ storageAdapter });

            const loginResponse = await auth.loginAndRedirect(
                { id: "u5", name: "A" },
                "/start"
            );
            const firstCookie = extractCookiePair(
                loginResponse.headers.get("set-cookie")
            );
            const firstRequest = makeRequest("/start", firstCookie);

            const updateSessionResponse = await auth.updateSession(
                firstRequest,
                { id: "u8", name: "Alice" },
                "/updated"
            );

            expect(getLocation(updateSessionResponse)).toBe("/updated");

            const secondCookie = extractCookiePair(
                updateSessionResponse.headers.get("set-cookie")
            );
            const secondRequest = makeRequest("/updated", secondCookie);
            console.log("[secondRequest]", secondRequest);

            const [error, user] = await tryCatch(async () => {
                return await auth.requireUserOrRedirect(firstRequest);
            });

            console.log("[error]", error);
            const usesr = await auth.requireUserOrRedirect(secondRequest);

            console.log("[user]", users);

            // const authUsers = await auth.getAuthUsers(secondRequest);

            // expect.soft(authUsers).not.toBe(null);
            // expect.soft(authUsers?.length).toBe(1);
            expect(user).toMatchObject({ id: "u8", name: "Alice" });
        }
    );

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
