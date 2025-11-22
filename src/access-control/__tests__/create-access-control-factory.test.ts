import { describe, expect, it } from "vitest";
import { createAccessControl } from "~/access-control/create-access-control";
import type { AuthUser } from "~/access-control/type";

interface User extends AuthUser {
    team: string;
}

const user: User = {
    id: "x1",
    roles: [
        { name: "admin", permissions: ["read:users"] },
        { name: "editor", permissions: ["write:posts"] },
    ],
    team: "alpha",
};

describe("createAccessControl factory", () => {
    const accessControlApis = createAccessControl<User>();

    it("should expose expected API members", () => {
        const expected = [
            "AccessControl",
            "AccessControlProvider",
            "checkAccess",
            "generateMenuAccess",
            "generateUserAccessControlConfig",
            "hasAttribute",
            "hasPermission",
            "hasRole",
            "requireAccess",
            "useAccessControl",
            "useHasAccess",
        ];
        for (const key of expected) {
            expect(key in accessControlApis).toBe(true);
        }
    });

    it("should delegate hasRole/hasPermission/hasAttribute correctly", () => {
        expect(accessControlApis.hasRole(["admin"], ["admin"])).toBe(true);
        expect(
            accessControlApis.hasPermission(["read:users"], ["read:users"])
        ).toBe(true);
        expect(
            accessControlApis.hasAttribute(
                { id: "x1", team: "alpha" },
                { team: "alpha" }
            )
        ).toBe(true);
    });

    it("should generate user access control config with expected shape", () => {
        const cfg = accessControlApis.generateUserAccessControlConfig(user);

        expect(cfg.userRoles).toEqual(["admin", "editor"]);
        expect(cfg.userPermissions).toEqual(["read:users", "write:posts"]);
        expect(cfg.userAttributes).toMatchObject({ id: "x1", team: "alpha" });
    });

    it("should delegate and return correct section results for menu access", () => {
        const cfg = accessControlApis.generateUserAccessControlConfig(user);
        const menu = accessControlApis.generateMenuAccess(cfg, {
            dashboard: [
                { accessControl: { roles: ["admin"] }, link: "/dashboard" },
            ],
            posts: [
                {
                    accessControl: { permissions: ["write:posts"] },
                    link: "/posts",
                },
            ],
        });

        expect(menu.dashboard).toEqual({ hasAccess: true, link: "/dashboard" });
        expect(menu.posts).toEqual({ hasAccess: true, link: "/posts" });
    });
});
