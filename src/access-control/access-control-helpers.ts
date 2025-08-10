import { typedKeys } from "../utils/typed-keys";
import {
    AccessControlConfig,
    AccessControlStrictnessOptions,
    AuthUser,
    UserAccessControl,
    UserAttribute,
} from "./type";

/**
 * Checks if a user has the required roles based on their assigned roles.
 *
 * @param userRoles - Array of role names assigned to the user
 * @param requiredRoles - Array of role names required for access
 * @param strict - If true, user must have ALL required roles. If false, user needs at least ONE required role. Default: false
 * @returns True if the user has the required roles, false otherwise
 *
 * @example
 * ```typescript
 * const userRoles = ['admin', 'editor'];
 * const requiredRoles = ['admin'];
 *
 * // Non-strict mode (default) - user needs at least one role
 * hasRole(userRoles, requiredRoles); // true
 *
 * // Strict mode - user needs all roles
 * hasRole(userRoles, ['admin', 'superuser'], true); // false
 * ```
 */
export const hasRole = (
    userRoles: string[],
    requiredRoles: string[],
    strict = false
): boolean => {
    const roleCheckType = strict ? "every" : "some";
    return requiredRoles[roleCheckType]((role) => userRoles.includes(role));
};

/**
 * Checks if a user has the required permissions based on their assigned permissions.
 *
 * @param userPermissions - Array of permission strings assigned to the user
 * @param requiredPermissions - Array of permission strings required for access
 * @param strict - If true, user must have ALL required permissions. If false, user needs at least ONE required permission. Default: false
 * @returns True if the user has the required permissions, false otherwise
 *
 * @example
 * ```typescript
 * const userPermissions = ['read:users', 'write:users', 'read:posts'];
 * const requiredPermissions = ['read:users'];
 *
 * // Non-strict mode (default) - user needs at least one permission
 * hasPermission(userPermissions, requiredPermissions); // true
 *
 * // Strict mode - user needs all permissions
 * hasPermission(userPermissions, ['read:users', 'delete:users'], true); // false
 * ```
 */
export const hasPermission = (
    userPermissions: string[],
    requiredPermissions: string[],
    strict = false
): boolean => {
    const permissionCheckType = strict ? "every" : "some";
    return requiredPermissions[permissionCheckType]((permission) =>
        userPermissions.includes(permission)
    );
};

/**
 * Checks if a user has the required attributes based on their user attributes.
 * Performs attribute-based access control by comparing user attributes with required values.
 *
 * @template T - Type that extends AuthUser
 * @param userAttributes - Object containing the user's attributes (excluding roles)
 * @param requiredAttributes - Object containing the required attribute values for access
 * @param strict - If true, user must match ALL required attributes. If false, user needs to match at least ONE required attribute. Default: false
 * @returns True if the user has the required attributes, false otherwise
 *
 * @example
 * ```typescript
 * const userAttributes = { department: 'engineering', isActive: true, level: 'senior' };
 * const requiredAttributes = { department: 'engineering', isActive: true };
 *
 * // Non-strict mode (default) - user needs at least one matching attribute
 * hasAttribute(userAttributes, { department: 'engineering' }); // true
 *
 * // Strict mode - user needs all matching attributes
 * hasAttribute(userAttributes, requiredAttributes, true); // true
 * hasAttribute(userAttributes, { department: 'engineering', isActive: false }, true); // false
 * ```
 */
export const hasAttribute = <T extends AuthUser>(
    userAttributes: UserAttribute<T>,
    requiredAttributes: UserAttribute<T>,
    strict = false
): boolean => {
    const attributesCheckType = strict ? "every" : "some";
    return typedKeys(requiredAttributes)[attributesCheckType](
        (key) => userAttributes[key] === requiredAttributes[key]
    );
};

/**
 * Comprehensive authorization check that evaluates user access against required roles, permissions, and attributes.
 * This is the main function used throughout the access control system to determine if a user is authorized.
 *
 * @template TUser - Type that extends AuthUser
 * @param userAccess - The user's access control configuration containing their roles, permissions, and attributes
 * @param requiredAccess - The access requirements that need to be satisfied
 * @param strictnessOptions - Options to control strictness for each access type (roles, permissions, attributes)
 * @returns True if the user is authorized (meets all requirements), false otherwise
 *
 * @example
 * ```typescript
 * const userAccess: AccessControlConfig<AppUser> = {
 *   userRoles: ['editor'],
 *   userPermissions: ['read:posts', 'write:posts'],
 *   userAttributes: { department: 'content', isActive: true }
 * };
 *
 * const requiredAccess: UserAccessControl<AppUser> = {
 *   roles: ['editor', 'admin'],
 *   permissions: ['write:posts'],
 *   attributes: { isActive: true }
 * };
 *
 * // Check with default (non-strict) options
 * checkIfAuthorized(userAccess, requiredAccess); // true
 *
 * // Check with strict role checking (user must have ALL required roles)
 * checkIfAuthorized(userAccess, requiredAccess, { roles: true }); // false
 * ```
 */
export const checkIfAuthorized = <TUser extends AuthUser>(
    userAccess: AccessControlConfig<TUser>,
    requiredAccess: UserAccessControl<TUser>,
    strictnessOptions = {} as AccessControlStrictnessOptions
) => {
    const { userRoles, userPermissions, userAttributes } = userAccess;
    const { roles = [], permissions = [], attributes = {} } = requiredAccess;

    return (
        (roles.length === 0 ||
            hasRole(userRoles, roles, strictnessOptions.roles)) &&
        (permissions.length === 0 ||
            hasPermission(
                userPermissions,
                permissions,
                strictnessOptions.permissions
            )) &&
        (Object.keys(attributes).length === 0 ||
            hasAttribute<TUser>(
                userAttributes,
                attributes,
                strictnessOptions.attributes
            ))
    );
};
