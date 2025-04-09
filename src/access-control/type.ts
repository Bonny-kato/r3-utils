/**
 * Type definitions for the access control module.
 *
 * This module provides types and interfaces for implementing role-based
 * and permission-based access control in applications.
 */

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
    id: string;

    /**
     * The roles assigned to the user.
     * Each role has a name and associated permissions.
     */
    roles: UserRole[];

    /**
     * Additional user properties can be added through extension
     * or using the index signature.
     */
    [key: string]: any;
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
export type UserAttribute<T extends AuthUser = AuthUser> = Partial<AuthUserWithoutRoles<T>>;

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
export type AllPermissions<T extends AuthUser> = T["roles"][number]["permissions"][number];

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
     */
    roles?: RoleNames<T>[];

    /**
     * List of permissions required for access.
     * If provided, the user must have all of these permissions.
     */
    permissions?: UniquePermissions<T>[];

    /**
     * Additional attributes required for access.
     * If provided, the user must match all of these attributes.
     */
    attributes?: UserAttribute<T>;
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

export interface ActionErrorType<T = unknown> {
    /** Optional data associated with the error */
    data?: T;

    /** Descriptive error message providing details about the error */
    errorMessage?: string;
}
