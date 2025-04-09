import { AuthUser, UserAccessControl } from './type';
import { hasAttribute, hasPermission, hasRole } from './access-control-helpers';
import { generateUserAccessControlConfig } from './generate-user-access-control-config';

/**
 * Error class for unauthorized access
 */
export class UnauthorizedError extends Error {
    /**
     * Creates a new UnauthorizedError
     *
     * @param {string} message - Error message
     */
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

/**
 * Verifies that the user has the necessary access based on roles, permissions, and attributes.
 *
 * @template T - Type that extends AuthUser
 * @param {T} user - The user object.
 * @param {UserAccessControl<T>} userAccessControl - Access control requirements.
 * @param {string[]} [userAccessControl.roles=[]] - List of roles that are allowed access.
 * @param {string[]} [userAccessControl.permissions=[]] - List of permissions required for access.
 * @param {UserAttribute<T>} [userAccessControl.attributes={}] - Additional attributes required for access.
 *
 * @returns {boolean} True if the user has access, false otherwise.
 */
export const checkAccess = <T extends AuthUser>(
    user: T,
    { roles = [], permissions = [], attributes = {} }: UserAccessControl<T>
): boolean => {
    const { userRoles, userPermissions, userAttributes } = generateUserAccessControlConfig<T>(user);

    return (
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 || hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 || hasAttribute<T>(userAttributes, attributes))
    );
};

/**
 * Verifies that the user has the necessary access based on roles, permissions, and attributes.
 * Throws an UnauthorizedError if the user doesn't have access.
 *
 * @template T - Type that extends AuthUser
 * @param {T} user - The user object.
 * @param {UserAccessControl<T>} accessControl - Access control requirements.
 * @param {string[]} [accessControl.roles=[]] - List of roles that are allowed access.
 * @param {string[]} [accessControl.permissions=[]] - List of permissions required for access.
 * @param {UserAttribute<T>} [accessControl.attributes={}] - Additional attributes required for access.
 *
 * @returns {T} The user object if access is granted.
 *
 * @throws Will throw UnauthorizedError if the user doesn't have the necessary access.
 */
export const requireAccess = <T extends AuthUser>(user: T, accessControl: UserAccessControl<T>): T => {
    const hasAccess = checkAccess<T>(user, accessControl);

    if (!hasAccess) throw new UnauthorizedError();

    return user;
};
