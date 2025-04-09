/**
 * Type definitions for access control module
 */

/**
 * Interface representing a user role with permissions
 */
export interface UserRole {
    /**
     * The name of the role
     */
    name: string;

    /**
     * The permissions associated with this role
     */
    permissions: string[];
}

/**
 * Interface representing a base auth user
 */
export interface AuthUser {
    id: string;
    /**
     * The roles assigned to the user
     * Each role has a name and associated permissions
     */
    role: UserRole[];

    /**
     * Additional user properties can be added
     */
    [key: string]: any;
}

/**
 * Represents user attributes as a record with generic key and value types.
 */
export type UserAttribute = Record<string, boolean | number | string>;

/**
 * Interface for access control requirements
 */
export interface UserAccessControl {
    /**
     * List of roles that are allowed access
     */
    roles?: string[];

    /**
     * List of permissions required for access
     */
    permissions?: string[];

    /**
     * Additional attributes required for access
     */
    attributes?: UserAttribute;
}

/**
 * Configuration for access control
 */
export interface AccessControlConfig {
    /**
     * The permissions assigned to the user
     */
    userPermissions: string[];

    /**
     * The attributes assigned to the user
     */
    userAttributes: UserAttribute;

    /**
     * The roles assigned to the user
     */
    userRoles: string[];
}
