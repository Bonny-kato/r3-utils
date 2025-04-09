import { UserAccessControl, AuthUser } from './type';
import { hasAttribute, hasPermission, hasRole } from './access-control-helpers';
import { useAccessControl } from './access-control-provider';

/**
 * Custom hook to determine if the user has the specified roles, permissions, or attributes.
 * Uses the access control configuration from the AccessControlProvider context.
 *
 * @template T - Type that extends AuthUser
 * @param {UserAccessControl<T>} accessControl - The access control requirements.
 * @param {string[]} [accessControl.roles=[]] - The roles to check against the user's roles.
 * @param {string[]} [accessControl.permissions=[]] - The permissions to check against the user's permissions.
 * @param {Record<string, any>} [accessControl.attributes={}] - The attributes to check against the user's attributes.
 * @returns {boolean} - Returns true if the user has the required access, false otherwise.
 */
export const useHasAccess = <T extends AuthUser>({
    roles = [],
    permissions = [],
    attributes = {},
}: UserAccessControl<T>): boolean => {
    const { userRoles, userPermissions, userAttributes } = useAccessControl<T>();

    return (
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 || hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 || hasAttribute(userAttributes, attributes))
    );
};
