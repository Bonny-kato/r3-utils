import { UserAttribute, AuthUser } from './type';

/**
 * Checks if the user has any of the required roles.
 *
 * @param {string[]} userRoles - The roles assigned to the user.
 * @param {string[]} requiredRoles - The roles to check against.
 * @returns {boolean} - True if the user has any of the required roles, false otherwise.
 */
export const hasRole = (userRoles: string[], requiredRoles: string[]): boolean => {
    return requiredRoles.some((role) => userRoles.includes(role));
};

/**
 * Checks if the user has any of the required permissions.
 *
 * @param {string[]} userPermissions - The permissions assigned to the user.
 * @param {string[]} requiredPermissions - The permissions to check against.
 * @returns {boolean} - True if the user has any of the required permissions, false otherwise.
 */
export const hasPermission = (
    userPermissions: string[],
    requiredPermissions: string[]
): boolean => {
    return requiredPermissions.some((permission) => userPermissions.includes(permission));
};

/**
 * Checks if the user has the specified attributes.
 *
 * @template T - Type that extends AuthUser
 * @param {UserAttribute<T>} userAttributes - The attributes assigned to the user.
 * @param {UserAttribute<T>} requiredAttributes - The attributes to check against.
 * @returns {boolean} - True if the user has all the required attributes, false otherwise.
 */
export const hasAttribute = <T extends AuthUser>(
    userAttributes: UserAttribute<T>,
    requiredAttributes: UserAttribute<T>
): boolean => {
    return Object.keys(requiredAttributes).every(
        (key) => userAttributes[key] === requiredAttributes[key]
    );
};
