import { describe, expect, it } from "vitest";
import {
    AuthUser,
    hasAttribute,
    hasPermission,
    hasRole,
} from "~/access-control";

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
});
