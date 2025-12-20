import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { generateUserAccessControlConfig } from "~/access-control/generate-user-access-control-config";
import { AccessControlConfig, AuthUser, UserRole } from "~/access-control/type";
import { tryCatch } from "~/utils";

interface TestUser extends AuthUser {
    name: string;
    age: number;
    department?: string;
    isActive?: boolean;
}

const roles: UserRole[] = [
    { name: "admin", permissions: ["read:users", "write:users"] },
    { name: "editor", permissions: ["read:posts", "write:posts"] },
];

const user: TestUser = {
    age: 30,
    department: "engineering",
    id: "u1",
    isActive: true,
    name: "John",
    roles,
};

describe("generateUserAccessControlConfig", () => {
    it("flattens permissions from all roles", () => {
        const cfg = generateUserAccessControlConfig<TestUser>(user);
        expect(cfg.userPermissions).toEqual([
            "read:users",
            "write:users",
            "read:posts",
            "write:posts",
        ]);
    });

    it("maps role names from user roles", () => {
        const cfg = generateUserAccessControlConfig<TestUser>(user);
        expect(cfg.userRoles).toEqual(["admin", "editor"]);
    });

    it("excludes roles field from userAttributes and preserves others", () => {
        const cfg = generateUserAccessControlConfig<TestUser>(user);
        expect(cfg.userAttributes).toEqual({
            age: 30,
            department: "engineering",
            id: "u1",
            isActive: true,
            name: "John",
        });
        // Ensure roles are not present
        expect("roles" in (cfg.userAttributes as Record<string, unknown>)).toBe(
            false
        );
    });

    it("should throw error if user object is invalid or undefined", () => {
        const [configError, config] = tryCatch<
            AccessControlConfig<TestUser>,
            ZodError
        >(() => generateUserAccessControlConfig<TestUser>(undefined!));

        expect(config).toBe(null);
        expect(configError).not.toBe(null);
        expect(configError).toBeInstanceOf(ZodError);
        expect(configError?.issues.length).toBeGreaterThan(0);
    });

    it("handles user with no roles", () => {
        const cfg = generateUserAccessControlConfig<TestUser>({
            age: 22,
            id: "u2",
            name: "Jane",
            roles: [],
        });
        expect(cfg.userRoles).toEqual([]);
        expect(cfg.userPermissions).toEqual([]);
        expect(cfg.userAttributes).toEqual({ age: 22, id: "u2", name: "Jane" });
    });
});
