import { ErrorResponse } from "react-router";
import { describe, expect, it } from "vitest";
import { checkAccess, requireAccess } from "~/access-control/require-access";
import type { AuthUser } from "~/access-control/type";
import { HTTP_FORBIDDEN } from "~/http-client";
import { tryCatch } from "~/utils";

interface TestUser extends AuthUser {
    age: number;
    isActive: boolean;
}

const user: TestUser = {
    age: 18,
    id: "1",
    isActive: true,
    roles: [
        { name: "admin", permissions: ["read:users", "delete:users"] },
        { name: "viewer", permissions: ["read:projects"] },
    ],
};

describe("require-access & checkAccess", () => {
    it("should return true when role requirement is satisfied", () => {
        const ok = checkAccess<TestUser>(user, { roles: ["admin"] });
        expect(ok).toBe(true);
    });

    it("should respect strictness options for roles", () => {
        const ok = checkAccess<TestUser>(
            user,
            { roles: ["admin", "editor"] },
            { roles: true }
        );
        expect(ok).toBe(false);
    });

    it("should return user when authorized", () => {
        const result = requireAccess<TestUser>(user, {
            permissions: ["read:users"],
        });
        expect(result).toBe(user);
    });

    it("should throw 403 with default message when unauthorized", () => {
        const [error, authUser] = tryCatch(() => {
            return requireAccess<TestUser>(user, {
                permissions: ["write:users"],
            });
        });

        const parsedError = JSON.parse(error?.message ?? "") as ErrorResponse;

        expect(authUser).toBe(null);
        expect(parsedError.status).toBe(HTTP_FORBIDDEN);
    });

    it("should throw with custom message when unauthorized", () => {
        const custom = "Access denied: missing permission";

        const [error, authUser] = tryCatch(() => {
            return requireAccess<TestUser>(
                user,
                { permissions: ["create:users"] },
                { unauthorizedErrorMessage: custom }
            );
        });

        const parsedError = JSON.parse(error?.message ?? "") as ErrorResponse;

        expect(authUser).toBe(null);
        expect(parsedError.status).toBe(HTTP_FORBIDDEN);

        expect(parsedError.statusText).toBe(custom);
        expect(parsedError.data.message).toBe(custom);
    });
});
