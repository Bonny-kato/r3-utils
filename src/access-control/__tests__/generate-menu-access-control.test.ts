import { describe, expect, it } from "vitest";
import {
    generateMenuAccess,
    MenuConfig,
} from "~/access-control/generate-menu-access-control";
import { generateUserAccessControlConfig } from "~/access-control/generate-user-access-control-config";
import type { AuthUser } from "~/access-control/type";

interface TestUser extends AuthUser {
    location: string;
    age: number;
}

const user: TestUser = {
    age: 20,
    id: "m1",
    location: "mwanza",
    roles: [
        {
            name: "admin",
            permissions: ["read:users", "edit:document", "create:document"],
        },
        { name: "editor", permissions: ["read:roles"] },
    ],
};

const access = generateUserAccessControlConfig<TestUser>(user);

describe("generateMenuAccess", () => {
    it("returns hasAccess true and link for first accessible item in a menu array", () => {
        const menuConfig: MenuConfig<"dashboard", TestUser> = {
            dashboard: [
                { accessControl: { roles: ["admin"] }, link: "/dashboard" },
                {
                    accessControl: { permissions: ["read:roles"] },
                    link: "/roles",
                },
            ],
        };

        const result = generateMenuAccess(access, menuConfig);

        expect(result.dashboard.hasAccess).toBe(true);
        expect(result.dashboard.link).toBe("/dashboard");
    });

    it("returns hasAccess false and empty link when no items are accessible", () => {
        const config = {
            admin: [
                { accessControl: { roles: ["super-admin"] }, link: "/admin" },
            ],
        };

        const result = generateMenuAccess(access, config);
        expect(result.admin.hasAccess).toBe(false);
        expect(result.admin.link).toBe("");
    });

    it("processes multiple sections and returns access per section", () => {
        const config: MenuConfig<"a" | "b", TestUser> = {
            a: [{ accessControl: { permissions: ["read:roles"] }, link: "/a" }],
            b: [
                { accessControl: { attributes: { age: 20 } }, link: "/b1" },
                { accessControl: { attributes: { age: 21 } }, link: "/b2" },
            ],
        };
        const result = generateMenuAccess(access, config);
        expect(result.a).toEqual({ hasAccess: true, link: "/a" });
        expect(result.b).toEqual({ hasAccess: true, link: "/b1" });
    });

    it("respects per-item strictness options", () => {
        const config = {
            reports: [
                {
                    accessControl: {
                        attributes: { age: 20, location: "mwanza" },
                    },
                    link: "/reports/strict",
                    strictness: { attributes: true },
                },
            ],
        };
        const result = generateMenuAccess(access, config);
        expect(result.reports.hasAccess).toBe(true);
        expect(result.reports.link).toBe("/reports/strict");
    });

    it("chooses the first accessible item when multiple items are accessible", () => {
        const config = {
            tools: [
                { accessControl: { roles: ["editor"] }, link: "/tools/editor" },
                {
                    accessControl: { permissions: ["edit:document"] },
                    link: "/tools/edit",
                },
            ],
        };
        const result = generateMenuAccess(access, config);
        expect(result.tools.hasAccess).toBe(true);
        expect(result.tools.link).toBe("/tools/editor");
    });

    it("returns empty link for section with empty item list", () => {
        const config = { empty: [] as any[] };
        const result = generateMenuAccess(access, config);
        expect(result.empty.hasAccess).toBe(false);
        expect(result.empty.link).toBe("");
    });

    it("should work with AccessRequirement apis", () => {
        const menuConfig: MenuConfig<"staff", TestUser> = {
            staff: [
                {
                    accessControl: {
                        roles: {
                            list: ["admin"],
                            not: true,
                        },
                    },
                    link: "/staff",
                },
                {
                    accessControl: {
                        permissions: {
                            list: ["read:roles"],
                        },
                    },
                    link: "/roles",
                },
            ],
        };

        const result = generateMenuAccess(
            {
                ...access,
                userRoles: ["editor"],
            },
            menuConfig
        );

        expect(result.staff.hasAccess).toBe(true);
        expect(result.staff.link).toBe("/staff");
    });
});
