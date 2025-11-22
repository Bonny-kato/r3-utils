import { describe, expect, it } from "vitest";
import {
    AccessControlConfig,
    AuthUser,
    hasAttribute,
    hasPermission,
    hasRole,
    UserAccessControl,
} from "~/access-control";
import { checkIfAuthorized } from "~/access-control/access-control-helpers";

interface TestAccAuthUser extends AuthUser {
    age: number;
    location: string;
    name: string;
}

describe("Access Control Helpers", () => {
    const requiredRoles = ["admin", "editor"];
    const userRoles = ["admin"];

    const requiredPermissions = ["read:users", "create:users"];
    const userPermissions = ["read:users"];

    const requiredAttributes = {
        age: 25,
        location: "Arusha",
    };
    const userAttribute = {
        location: "Arusha",
    };

    it("should return true if user has any of required permissions", () => {
        expect(hasPermission(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false if user does not have all required permissions", () => {
        expect(hasPermission(userPermissions, requiredPermissions, true)).toBe(
            false
        );
    });

    it("should return true if user has any of required roles", () => {
        expect(hasRole(userRoles, requiredRoles)).toBe(true);
    });

    it("should return false if user does not have all required roles", () => {
        expect(hasRole(userRoles, requiredRoles, true)).toBe(false);
    });

    it("should return true is user has any of required attributes", () => {
        expect(
            hasAttribute<TestAccAuthUser>(userAttribute, requiredAttributes)
        ).toBe(true);
    });

    it("should return false is user dose not have all required attributes", () => {
        expect(
            hasAttribute<TestAccAuthUser>(
                userAttribute,
                requiredAttributes,
                true
            )
        ).toBe(false);
    });

    it("should respect requireAll option object for roles and permissions", () => {
        expect(hasRole(userRoles, requiredRoles, { requireAll: true })).toBe(
            false
        );

        expect(
            hasPermission(userPermissions, requiredPermissions, {
                requireAll: true,
            })
        ).toBe(false);
    });

    it("should apply negation for roles and permissions when not is true", () => {
        const forbiddenRole = ["banned"];
        const forbiddenPermission = ["delete:users"];

        // User does not have forbidden items, so negated check should pass
        expect(hasRole(userRoles, forbiddenRole, { not: true })).toBe(true);

        expect(
            hasPermission(userPermissions, forbiddenPermission, {
                not: true,
            })
        ).toBe(true);
    });

    it("should support AccessRequirement with requireAll and not in checkIfAuthorized", () => {
        type TUser = TestAccAuthUser;

        const accessConfig: AccessControlConfig<TUser> = {
            userAttributes: {
                age: 18,
                location: "mwanza",
                name: "John",
            },
            userPermissions: ["read:users"],
            userRoles: ["admin"],
        };

        const baseRequired: UserAccessControl<TUser> = {
            attributes: { age: 18 },
            permissions: ["read:users"],
            roles: ["admin"],
        };

        // Array-based requirements should continue to work
        expect(checkIfAuthorized(accessConfig, baseRequired)).toBe(true);

        const negatedRoleRequirement: UserAccessControl<TUser> = {
            roles: {
                list: ["admin"],
                not: true,
            },
        };

        // not: true inverts the role match so having the role denies access
        expect(checkIfAuthorized(accessConfig, negatedRoleRequirement)).toBe(
            false
        );

        const negatedMissingRoleRequirement: UserAccessControl<TUser> = {
            roles: {
                list: ["super-admin"],
                not: true,
            },
        };

        // not: true with a role the user does not have should grant access
        expect(
            checkIfAuthorized(accessConfig, negatedMissingRoleRequirement)
        ).toBe(true);

        const attributesRequirement: UserAccessControl<TUser> = {
            attributes: {
                criteria: { age: 18, location: "Arusha" },
                requireAll: false,
            },
        };

        // requireAll:false => at least one attributes object must match
        expect(checkIfAuthorized(accessConfig, attributesRequirement)).toBe(
            true
        );

        const strictAttributesRequirement: UserAccessControl<TUser> = {
            attributes: {
                criteria: { age: 18, location: "Arusha" },
                requireAll: true,
            },
        };

        // requireAll:true => all attribute objects must match, which they don't
        expect(
            checkIfAuthorized(accessConfig, strictAttributesRequirement)
        ).toBe(false);
    });

    it("should support AttributeRequirement object list for attributes", () => {
        type TUser = TestAccAuthUser;

        const accessConfig: AccessControlConfig<TUser> = {
            userAttributes: {
                age: 18,
                location: "Arusha",
                name: "John",
            },
            userPermissions: ["read:users"],
            userRoles: ["admin"],
        };

        // New object-based attribute requirement (no array)
        const objectBasedAttributes: UserAccessControl<TUser> = {
            attributes: {
                criteria: { location: "Arusha" },
                not: false,
                requireAll: true,
            },
        } as UserAccessControl<TUser>;

        expect(checkIfAuthorized(accessConfig, objectBasedAttributes)).toBe(
            true
        );

        const negatedObjectAttributes: UserAccessControl<TUser> = {
            attributes: {
                criteria: { location: "Dodoma" },
                not: true,
            },
        } as UserAccessControl<TUser>;

        // User does not have location Dodoma, and not:true inverts => grants access
        expect(checkIfAuthorized(accessConfig, negatedObjectAttributes)).toBe(
            true
        );
    });

    it("should support deep attribute equality checks in hasAttribute", () => {
        interface DeepUser extends TestAccAuthUser {
            profile: {
                address: { city: string; zip: number };
                preferences: { email: boolean };
            };
        }

        const userAttrs: Partial<DeepUser> = {
            profile: {
                address: { city: "Arusha", zip: 12345 },
                preferences: { email: true },
            },
        };

        // Deep objects must be strictly equal (shape and values) to match
        const requiredOk: Partial<DeepUser> = {
            profile: {
                address: { city: "Arusha", zip: 12345 },
                preferences: { email: true },
            },
        };

        expect(hasAttribute<DeepUser>(userAttrs, requiredOk)).toBe(true);

        const requiredBad: Partial<DeepUser> = {
            profile: {
                address: { city: "Arusha", zip: 12345 },
                preferences: { email: false },
            },
        };

        expect(hasAttribute<DeepUser>(userAttrs, requiredBad)).toBe(false);
    });
});
