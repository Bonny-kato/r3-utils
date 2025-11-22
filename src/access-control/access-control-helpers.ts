import { typedKeys } from "~/utils";
import {
    AccessCheckOptions,
    AccessControlConfig,
    AccessControlStrictnessOptions,
    AccessRequirement,
    AuthUser,
    RoleNames,
    UniquePermissions,
    UserAccessControl,
    UserAttribute,
} from "./type";

const normalizeCheckOptions = (
    options: boolean | AccessCheckOptions | undefined
): Required<AccessCheckOptions> => {
    if (typeof options === "boolean") {
        return { not: false, requireAll: options };
    }

    return {
        not: options?.not ?? false,
        requireAll: options?.requireAll ?? false,
    };
};

const isAccessRequirement = <T>(
    value: unknown
): value is AccessRequirement<T> => {
    return (
        !!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        "list" in (value as Record<string, unknown>)
    );
};

export const normalizeAccessRequirement = <T>(
    input: T | T[] | AccessRequirement<T> | undefined,
    legacyStrictness?: boolean
): AccessRequirement<T> => {
    const defaultRequireAll = legacyStrictness ?? false;

    if (input == null) {
        return {
            list: [],
            not: false,
            requireAll: defaultRequireAll,
        };
    }

    if (isAccessRequirement<T>(input)) {
        return {
            list: input.list ?? [],
            not: input.not ?? false,
            requireAll: input.requireAll ?? defaultRequireAll,
        };
    }

    if (Array.isArray(input)) {
        return {
            list: input,
            not: false,
            requireAll: defaultRequireAll,
        };
    }

    // Fallback for a single value (e.g., plain attribute object)
    return {
        list: [input],
        not: false,
        requireAll: defaultRequireAll,
    };
};

/**
 * Checks if a user has the required roles based on their assigned roles.
 *
 * @param userRoles - Array of role names assigned to the user
 * @param requiredRoles - Array of role names required for access
 * @param options - Options controlling how the requirement is evaluated.
 * Can be a boolean (legacy `strict` flag) or an object with
 * `requireAll` and `not` for granular control.
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
 * // Strict mode using legacy boolean - user needs all roles
 * hasRole(userRoles, ['admin', 'superuser'], true); // false
 *
 * // Using options object
 * hasRole(userRoles, ['admin', 'superuser'], { requireAll: true }); // false
 * hasRole(userRoles, ['banned'], { not: true }); // true when user does NOT have 'banned'
 * ```
 */
export const hasRole = <TUser extends AuthUser>(
    userRoles: RoleNames<TUser>[],
    requiredRoles: RoleNames<TUser>[],
    options: boolean | AccessCheckOptions = {}
): boolean => {
    const { requireAll, not } = normalizeCheckOptions(options);
    const roleCheckType = requireAll ? "every" : "some";
    const hasMatch =
        requiredRoles.length === 0
            ? true
            : requiredRoles[roleCheckType]((role) => userRoles.includes(role));

    return not ? !hasMatch : hasMatch;
};

/**
 * Checks if a user has the required permissions based on their assigned permissions.
 *
 * @param userPermissions - Array of permission strings assigned to the user
 * @param requiredPermissions - Array of permission strings required for access
 * @param options - Options controlling how the requirement is evaluated.
 * Can be a boolean (legacy `strict` flag) or an object with
 * `requireAll` and `not` for granular control.
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
 * // Strict mode using legacy boolean - user needs all permissions
 * hasPermission(userPermissions, ['read:users', 'delete:users'], true); // false
 *
 * // Using options object
 * hasPermission(userPermissions, ['banned:action'], { not: true }); // true when user does NOT have banned:action
 * ```
 */
export const hasPermission = <TUser extends AuthUser>(
    userPermissions: UniquePermissions<TUser>[],
    requiredPermissions: UniquePermissions<TUser>[],
    options: boolean | AccessCheckOptions = {}
): boolean => {
    const { requireAll, not } = normalizeCheckOptions(options);
    const permissionCheckType = requireAll ? "every" : "some";
    const hasMatch =
        requiredPermissions.length === 0
            ? true
            : requiredPermissions[permissionCheckType]((permission) =>
                  userPermissions.includes(permission)
              );

    return not ? !hasMatch : hasMatch;
};

// ----------------------------------------------------------------------
//  hasAttributes
// ----------------------------------------------------------------------

const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (a && b && typeof a === "object") {
        // Arrays
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((v, i) => deepEqual(v, b[i]));
        }

        // Objects
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;

        return aKeys.every((key) => deepEqual(a[key], b[key]));
    }

    return false;
};

/**
 * Checks if a user has the required attributes based on their user attributes.
 * Performs attribute-based access control by comparing user attributes with required values.
 *
 * @template T - Type that extends AuthUser
 * @param userAttributes - Object containing the user's attributes (excluding roles)
 * @param requiredAttributes - Object (or list of objects) containing the required
 * attribute values for access.
 * @param options - Options controlling how the requirement is evaluated.
 * Can be a boolean (legacy `strict` flag) or an object with
 * `requireAll` and `not` for granular control.
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
    requiredAttributes: UserAttribute<T> | UserAttribute<T>[],
    options: boolean | AccessCheckOptions = {}
): boolean => {
    const { requireAll, not } = normalizeCheckOptions(options);
    const requiredList = Array.isArray(requiredAttributes)
        ? requiredAttributes
        : [requiredAttributes];

    if (requiredList.length === 0) {
        const base = true;
        return not ? !base : base;
    }

    let hasMatch: boolean;

    if (requiredList.length === 1) {
        const [attr] = requiredList;
        const keyCheckType = requireAll ? "every" : "some";

        hasMatch = typedKeys(attr)[keyCheckType]((key) =>
            deepEqual(userAttributes[key], attr[key])
        );
    } else {
        const listCheckType = requireAll ? "every" : "some";

        hasMatch = requiredList[listCheckType]((attr) =>
            typedKeys(attr).every((key) =>
                deepEqual(userAttributes[key], attr[key])
            )
        );
    }
    return not ? !hasMatch : hasMatch;
};

// ----------------------------------------------------------------------
//  checkIfAuthorized
// ----------------------------------------------------------------------

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
    const { roles, permissions, attributes } = requiredAccess;

    // ----------------------------------------------------------------------
    //  Normalize Access
    // ----------------------------------------------------------------------
    const normalizedRoles = normalizeAccessRequirement<RoleNames<TUser>>(
        roles as RoleNames<TUser>[] | AccessRequirement<RoleNames<TUser>>,
        strictnessOptions.roles
    );

    const normalizedPermissions = normalizeAccessRequirement<
        UniquePermissions<TUser>
    >(permissions, strictnessOptions.permissions);

    const normalizedAttributes = normalizeAccessRequirement<
        UserAttribute<TUser>
    >(attributes, strictnessOptions.attributes);

    // ----------------------------------------------------------------------
    //  Access control checks
    // ----------------------------------------------------------------------

    const rolesOk =
        normalizedRoles.list.length === 0 ||
        hasRole(userRoles, normalizedRoles.list, {
            not: normalizedRoles.not,
            requireAll: normalizedRoles.requireAll,
        });

    const permissionsOk =
        normalizedPermissions.list.length === 0 ||
        hasPermission(userPermissions, normalizedPermissions.list, {
            not: normalizedPermissions.not,
            requireAll: normalizedPermissions.requireAll,
        });

    const attributesOk =
        normalizedAttributes.list.length === 0 ||
        hasAttribute<TUser>(userAttributes, normalizedAttributes.list, {
            not: normalizedAttributes.not,
            requireAll: normalizedAttributes.requireAll,
        });

    return rolesOk && permissionsOk && attributesOk;
};
