import { isEmpty, normalizeToArray, typedKeys } from "~/utils";
import {
    AccessCheckOptions,
    AccessControlConfig,
    AccessControlStrictnessOptions,
    AccessRequirement,
    AttributePredicate,
    AttributeRequirement,
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

const isAttributesRequirement = <T extends AuthUser>(
    input: unknown
): input is AttributeRequirement<T> => {
    return (
        !!input &&
        typeof input === "object" &&
        !Array.isArray(input) &&
        "criteria" in input
    );
};

// ----------------------------------------------------------------------
//  normalizeAccessRequirement
// ----------------------------------------------------------------------

export const normalizeAccessRequirement = <T>(
    input: T | T[] | AccessRequirement<T> | AttributeRequirement | undefined,
    legacyStrictness = false
): AccessRequirement<T> => {
    if (input == null) {
        return {
            list: [],
            not: false,
            requireAll: legacyStrictness,
        };
    }

    if (isAccessRequirement<T>(input) || isAttributesRequirement(input)) {
        const listRaw = isAttributesRequirement(input)
            ? input.criteria
            : input.list;

        return {
            list: normalizeToArray(listRaw as T),
            not: input.not ?? false,
            requireAll: input.requireAll ?? legacyStrictness,
        };
    }
    // backwards compatibility for versions <= v2.3.4
    if (Array.isArray(input)) {
        return {
            list: input,
            not: false,
            requireAll: legacyStrictness,
        };
    }

    // Fallback for a single value (e.g., plain attribute object)
    return {
        list: [input as T],
        not: false,
        requireAll: legacyStrictness,
    };
};

// ----------------------------------------------------------------------
//  hasRole
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
//  hasPermission
// ----------------------------------------------------------------------

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

/**
 * Recursively checks whether two values are deeply equal.
 *
 * @remarks
 * This function can handle comparisons for:
 * - Primitive values (e.g., `string`, `number`, `boolean`)
 * - Arrays
 * - Plain objects
 *
 * Objects and arrays are compared recursively to ensure deep equality.
 * If either argument is not of the same type, the function returns `false`.
 *
 * @param a - The first value to compare. Can be of any type.
 * @param b - The second value to compare. Can be of any type.
 * @returns `true` if the inputs are deeply equal, otherwise `false`.
 *
 * @example
 * ```ts
 * // Comparing primitive values
 * deepEqual(1, 1); // true
 * deepEqual('hello', 'world'); // false
 *
 * // Comparing arrays
 * deepEqual([1, 2, 3], [1, 2, 3]); // true
 * deepEqual([1, 2], [1, 2, 3]); // false
 *
 * // Comparing objects
 * deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * deepEqual({ a: 1, b: 2 }, { a: 1, c: 3 }); // false
 *
 * // Mixed types
 * deepEqual({ a: [1, 2] }, { a: [1, 2] }); // true
 * deepEqual({ a: [1, 2] }, { a: [2, 1] }); // false
 * ```
 */
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

// ----------------------------------------------------------------------
/**
 * Checks if user attributes match a predicate function.
 *
 * This overload allows for dynamic, conditional attribute checks using custom logic
 * that cannot be expressed through simple value matching (e.g., age restrictions,
 * date comparisons, numeric thresholds, complex business rules).
 *
 * @template T - Type that extends AuthUser
 * @param userAttributes - The current user's attributes to evaluate
 * @param predicate - A function that receives the user attributes and returns true if access should be granted
 * @returns True if the predicate function returns true, false otherwise
 *
 * @example
 * ```typescript
 * const userAttrs = { age: 25, department: 'engineering', yearsOfExperience: 3 };
 *
 * // Age-based check
 * const isAdult = (attrs: Required<UserAttribute<AppUser>>) => attrs.age >= 18;
 * hasAttribute(userAttrs, isAdult); // true
 *
 * // Complex business logic
 * const isSeniorEngineer = (attrs: Required<UserAttribute<AppUser>>) =>
 *   attrs.department === 'engineering' && attrs.yearsOfExperience >= 5;
 * hasAttribute(userAttrs, isSeniorEngineer); // false
 * ```
 */
export function hasAttribute<T extends AuthUser>(
    userAttributes: UserAttribute<T>,
    predicate: AttributePredicate<T>
): boolean;

/**
 * Checks if user attributes match the required attribute criteria.
 *
 * This overload performs value-based matching between user attributes and required attributes.
 * Supports single attribute objects, arrays of attribute objects, and advanced options
 * for controlling match behavior (requireAll, not).
 *
 * @template T - Type that extends AuthUser
 * @param userAttributes - The current user's attributes to evaluate
 * @param requiredAttributes - The attribute(s) required for access. Can be a single attribute object or an array of attribute objects
 * @param options - Options controlling how the requirement is evaluated. Can be a boolean (legacy `strict` flag) or an object with `requireAll` and `not` for granular control
 * @returns True if the user's attributes satisfy the requirements, false otherwise
 *
 * @example
 * ```typescript
 * const userAttrs = { department: 'engineering', isActive: true, level: 'senior' };
 *
 * // Single attribute check (non-strict, any matching key)
 * hasAttribute(userAttrs, { department: 'engineering' }); // true
 *
 * // Multiple attributes (at least one key must match by default)
 * hasAttribute(userAttrs, { department: 'engineering', isActive: true }); // true
 *
 * // Strict mode using boolean - all keys must match
 * hasAttribute(userAttrs, { department: 'engineering', level: 'junior' }, true); // false
 *
 * // Using options object with requireAll
 * hasAttribute(userAttrs, { department: 'engineering', isActive: true }, { requireAll: true }); // true
 *
 * // Negation - user must NOT have these attributes
 * hasAttribute(userAttrs, { isBanned: true }, { not: true }); // true (user doesn't have isBanned)
 * ```
 */
export function hasAttribute<T extends AuthUser>(
    userAttributes: UserAttribute<T>,
    requiredAttributes: UserAttribute<T>,
    options?: AccessCheckOptions | boolean
): boolean;

export function hasAttribute<T extends AuthUser>(
    userAttributes: UserAttribute<T>,
    requiredAttributes: UserAttribute<T> | AttributePredicate<T>,
    options: boolean | AccessCheckOptions = {}
): boolean {
    if (typeof requiredAttributes === "function") {
        return requiredAttributes(userAttributes as Required<UserAttribute<T>>);
    }

    const { requireAll, not } = normalizeCheckOptions(options);

    if (isEmpty(requiredAttributes)) {
        const base = true;
        return not ? !base : base;
    }

    const keyCheckType = requireAll ? "every" : "some";

    const hasMatch = typedKeys(requiredAttributes)[keyCheckType]((key) =>
        deepEqual(userAttributes[key], requiredAttributes[key])
    );
    return not ? !hasMatch : hasMatch;
}

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

    //💡 Handle attributes - check if it's a predicate function first
    let attributesOk: boolean;
    if (typeof attributes === "function") {
        attributesOk = hasAttribute<TUser>(userAttributes, attributes);
    } else if (attributes == null) {
        attributesOk = true;
    } else {
        const normalizedAttributes = normalizeAccessRequirement<
            UserAttribute<TUser>
        >(attributes, strictnessOptions.attributes);

        attributesOk = hasAttribute<TUser>(
            userAttributes,
            normalizedAttributes.list[0],
            {
                not: normalizedAttributes.not,
                requireAll: normalizedAttributes.requireAll,
            }
        );
    }

    return rolesOk && permissionsOk && attributesOk;
};
