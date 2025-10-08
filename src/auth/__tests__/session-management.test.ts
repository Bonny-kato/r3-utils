import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Auth } from "~/auth";
import {
    createMockAuth,
    getSessionCookie,
    mockRedisAdapter,
    mockRequest,
    TestUser,
} from "~/auth/__tests__/auth-test-utils";
import { HTTP_FOUND } from "~/http-client/status-code";
import { tryCatch } from "~/utils";

const getLocation = (res: Response) => res.headers.get("Location");

describe("Auth: Session Management", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    afterEach(async () => {
        vi.restoreAllMocks();
    });

    it("should redirect user to login page when session expires", async () => {
        const auth = new Auth<TestUser>({
            cookie: {
                name: "__test_session",
                secrets: ["my-secret"],
                maxAge: 1,
            },
            storageAdapter: mockRedisAdapter,
            sessionStorageType: "in-custom-db",
        });

        const res = await auth.loginAndRedirect({ id: "ttl-1" }, "/ttl");
        const cookie = getSessionCookie(res);

        // Advance time to force expiration
        vi.useFakeTimers();
        vi.setSystemTime(Date.now() + 3000);

        const [requireUserError, user] = await tryCatch<TestUser, Response>(
            async () => {
                return await auth.requireUserOrRedirect(
                    mockRequest("/ttl", cookie)
                );
            }
        );

        expect(user).toBe(null);
        expect(requireUserError).toBeInstanceOf(Response);

        expect(requireUserError?.status).toBe(HTTP_FOUND);
        expect(getLocation(requireUserError as Response)).toBe(
            "/login?redirectTo=%2Fttl"
        );
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
        expect(getLocation(updateSessionResponse)).toBe("/b");

        const secondRequest = mockRequest("/b", secondCookie);

        const [error, user] = await tryCatch(async () => {
            return await auth.requireUserOrRedirect(secondRequest);
        });

        expect(error).toBe(null);
        expect(user).toEqual({ id: "sid-1", name: "X" });
    });

    it("Multiple concurrent sessions for same user are allowed by default", async () => {
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
});
