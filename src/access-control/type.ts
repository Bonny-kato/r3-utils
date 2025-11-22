/**
 * Type definitions for the access control module.
 *
 * This module provides types and interfaces for implementing role-based
 * and permission-based access control in applications.
 */

import { ErrorType } from "~/http-client/try-catch-http";

/**
 * Interface representing a user role with associated permissions.
 *
 * @example
 * ```typescript
 * const adminRole: UserRole = {
 *   name: 'admin',
 *   permissions: ['read:users', 'write:users', 'delete:users']
 * };
 * ```
 */
export interface UserRole {
    /** The unique name identifier for the role (e.g., 'admin', 'editor') */
    name: string;

    /**
     * The list of permission strings associated with this role.
     * Typically formatted as action:resource (e.g., 'read:users')
     */
    permissions: string[];
}

/**
 * Base interface for authenticated users with role-based permissions.
 *
 * This interface can be extended to create application-specific user types
 * while maintaining the role-based permission system.
 *
 * @example
 * ```typescript
 * interface AppUser extends AuthUser {
 *   email: string;
 *   displayName: string;
 *   token: string;
 * }
 * ```
 */
export interface AuthUser {
    /** Unique identifier for the user */
    id: string | number;

    /**
     * The roles assigned to the user.
     * Each role has a name and associated permissions.
     */
    roles: UserRole[];
}

/**
 * Utility type that removes the 'roles' property from an AuthUser type.
 *
 * @template T - Type that extends AuthUser
 */
export type AuthUserWithoutRoles<T extends AuthUser> = Omit<T, "roles">;

/**
 * Represents user attributes as a partial record of user properties.
 * Used for specifying attribute-based access control conditions.
 *
 * @template T - Type that extends AuthUser
 *
 * @example
 * ```typescript
 * const requiredAttributes: UserAttribute<AppUser> = {
 *   department: 'engineering',
 *   isActive: true
 * };
 * ```
 */
export type UserAttribute<T extends AuthUser = AuthUser> = Partial<
    AuthUserWithoutRoles<T>
>;

/**
 * Extracts the possible role names from a user type.
 *
 * @template T - Type that extends AuthUser
 *
 * @example
 * For a user with roles [{ name: 'admin', ... }, { name: 'editor', ... }],
 * RoleNames<T> would be 'admin' | 'editor'
 */
export type RoleNames<T extends AuthUser> = T["roles"][number]["name"];

/**
 * Extracts all possible permission strings from a user type's roles.
 *
 * @template T - Type that extends AuthUser
 */
export type AllPermissions<T extends AuthUser> =
    T["roles"][number]["permissions"][number];

/**
 * Creates a union type of all unique permission strings from a user type.
 * Uses conditional types to extract and deduplicate permission strings.
 *
 * @template T - Type that extends AuthUser
 *
 * @example
 * For roles with permissions ['read:users', 'write:users'] and ['read:users', 'read:posts'],
 * UniquePermissions<T> would be 'read:users' | 'write:users' | 'read:posts'
 */
export type UniquePermissions<T extends AuthUser> =
    AllPermissions<T> extends infer P ? (P extends string ? P : never) : never;

/** Options for access control checks */
export type AccessCheckOptions = {
    /** If true, all items in the list must match. If false (default), at least one must match.
     *
     * @default false
     * */
    requireAll?: boolean;
    /** If true, access is granted only if the condition is NOT met.
     *
     * @default false
     * */
    not?: boolean;
};

/** A normalized access requirement that enforces consistent validation logic */

/**
 * Configuration for a single access requirement list.
 *
 * This type is used to provide fine‑grained control over how
 * roles, permissions, or attributes are evaluated.
 */
export interface AccessRequirement<T> extends AccessCheckOptions {
    /**
     * The list of items to validate against the current user context.
     */
    list: T[];
}

/**
 * Interface for specifying access control requirements.
 * Can be used to define what roles, permissions, or attributes
 * are required to access a resource or perform an action.
 *
 * @template T - Type that extends AuthUser
 *
 * @example
 * ```typescript
 * const accessRequirements: UserAccessControl<AppUser> = {
 *   roles: ['admin', 'editor'],
 *   permissions: ['write:articles'],
 *   attributes: { isActive: true }
 * };
 * ```
 */
export interface UserAccessControl<T extends AuthUser = AuthUser> {
    /**
     * List of roles that are allowed access.
     * If provided, the user must have at least one of these roles.
     *
     * The simple array format is kept for backward compatibility.
     * For new code, prefer using {@link AccessRequirement} to
     * configure per‑requirement options like `requireAll` and `not`.
     */
    roles?: RoleNames<T>[] | AccessRequirement<RoleNames<T>>;

    /**
     * List of permissions required for access.
     * If provided, the user must have at least one of these permissions
     * by default.
     *
     * The simple array format is kept for backward compatibility.
     * For new code, prefer using {@link AccessRequirement} to
     * configure per‑requirement options like `requireAll` and `not`.
     */
    permissions?:
        | UniquePermissions<T>[]
        | AccessRequirement<UniquePermissions<T>>;

    /**
     * Additional attributes required for access.
     * If provided, the user must match the configured attributes.
     *
     * The plain object format is kept for backward compatibility.
     * For new code, prefer using {@link AccessRequirement} to
     * configure per‑requirement options like `requireAll` and `not`.
     */
    attributes?: UserAttribute<T> | AccessRequirement<UserAttribute<T>>;
}

/**
 * Configuration for the access control system.
 * Contains the current user's roles, permissions, and attributes
 * for access control evaluation.
 *
 * @template T - Type that extends AuthUser
 */
export interface AccessControlConfig<T extends AuthUser = AuthUser> {
    /**
     * The complete list of permissions the user has,
     * derived from all their assigned roles.
     */
    userPermissions: UniquePermissions<T>[];

    /**
     * The user's attributes for attribute-based access control.
     */
    userAttributes: UserAttribute<T>;

    /**
     * The list of role names assigned to the user.
     */
    userRoles: RoleNames<T>[];
}

/**
 * Interface for action error types with optional data and error message.
 * Used for standardized error handling in access control operations.
 *
 * @template T - Type of the optional data associated with the error
 */
export type ActionErrorType<
    TPayload = unknown,
    TError extends ErrorType = ErrorType,
> = [error: TError, payload: TPayload];
/**
 * Configuration options for controlling strictness in access control checks.
 * When set to true, the corresponding check requires ALL conditions to be met.
 * When set to false or undefined, only ONE condition needs to be met.
 *
 * @deprecated Deprecated. Use `requireAll` inside the specific access
 * property (roles, permissions, or attributes) instead.
 *
 * @example
 * ```typescript
 * const strictOptions: AccessControlStrictnessOptions = {
 *   roles: true,        // User must have ALL required roles
 *   permissions: false, // User needs at least ONE required permission
 *   attributes: true    // User must match ALL required attributes
 * };
 * ```
 */
export type AccessControlStrictnessOptions = {
    /** If true, user must have ALL required attributes. If false, user needs at least ONE. */
    attributes?: boolean;
    /** If true, user must have ALL required permissions. If false, user needs at least ONE. */
    permissions?: boolean;
    /** If true, user must have ALL required roles. If false, user needs at least ONE. */
    roles?: boolean;
};

/**
 * Options for the requireAccess function to customize access control behavior.
 *
 * @example
 * ```typescript
 * const options: RequireAccessOptions = {
 *   strictness: { roles: true, permissions: false },
 *   unauthorizedErrorMessage: 'Access denied: insufficient privileges'
 * };
 * ```
 */
export type RequireAccessOptions = {
    /**
     * Strictness configuration for different access control types.
     *
     * @deprecated Deprecated. Use `requireAll` inside the specific access
     * property (roles, permissions, or attributes) instead.
     */
    strictness?: AccessControlStrictnessOptions;
    /** Custom error message to display when access is denied */
    unauthorizedErrorMessage?: string;
};

/**
 * Type for the generateUserAccessControlConfig function
 * Allows consumers to provide their own user type that extends AuthUser
 */
export type GenerateAccessControlConfigFunc<T extends AuthUser> = (
    user?: T
) => AccessControlConfig<T>;
