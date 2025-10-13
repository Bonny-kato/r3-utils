import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuth,
    DataWithResponseInit,
    getSessionCookie,
    mockRedisAdapter,
    mockRequest,
    TestUser,
} from "~/auth/auth-test-utils";
import { HTTP_INTERNAL_SERVER_ERROR } from "~/http-client/status-code";
import { tryCatch } from "~/utils";

describe("Auth: Error Handling & Edge Cases", () => {
    afterEach(async () => {
        vi.restoreAllMocks();
    });

    it("should return 500 error when adapter set fails during login", async () => {
        const auth = createMockAuth();

        const setSpy = vi
            .spyOn(mockRedisAdapter, "set")
            .mockResolvedValue([new Error("Unable to store auth user"), null]);

        const [loginError, response] = await tryCatch<
            Response,
            DataWithResponseInit
        >(async () => {
            return await auth.loginAndRedirect({ id: "e1" }, "/");
        });

        expect(response).toBe(null);
        expect(loginError?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(loginError?.data).toBe("Unable to store auth user");

        setSpy.mockRestore();
    });

    it("should throw 500 error when adapter get fails during requireUserOrRedirect", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect({ id: "e2" }, "/");
        const cookie = getSessionCookie(res);

        const getSpy = vi
            .spyOn(mockRedisAdapter, "get")
            .mockResolvedValue([new Error("boom"), null]);

        const [error, response] = await tryCatch<
            TestUser,
            DataWithResponseInit
        >(
            async () =>
                await auth.requireUserOrRedirect(mockRequest("/", cookie))
        );

        expect(response).toBe(null);
        expect(error?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(error?.data).toBe("boom");

        getSpy.mockRestore();
    });

    it("should throw 500 error when adapter remove fails during logout", async () => {
        const auth = createMockAuth();

        const res = await auth.loginAndRedirect({ id: "e3" }, "/");
        const cookie = getSessionCookie(res);

        const removeSpy = vi
            .spyOn(mockRedisAdapter, "remove")
            .mockResolvedValue([new Error("nope"), null]);

        const [error, response] = await tryCatch<
            Response,
            DataWithResponseInit
        >(async () => await auth.logoutAndRedirect(mockRequest("/", cookie)));

        expect(response).toBe(null);
        expect(error?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(error?.data).toBe("nope");

        removeSpy.mockRestore();
    });
});
