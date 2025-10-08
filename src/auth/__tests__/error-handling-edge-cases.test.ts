import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuth,
    DataWithResponseInit,
    getSessionCookie,
    mockRedisAdapter,
    mockRequest,
} from "~/auth/__tests__/auth-test-utils";
import { HTTP_INTERNAL_SERVER_ERROR } from "~/http-client/status-code";

describe("Auth: Error Handling & Edge Cases", () => {
    afterEach(async () => {
        vi.restoreAllMocks();
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
});
