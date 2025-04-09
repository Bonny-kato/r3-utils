import { ReactNode } from 'react';
import { AuthUser, UserAccessControl } from './type';
import { hasAttribute, hasPermission, hasRole } from './access-control-helpers';
import { useAccessControl } from './access-control-provider';

/**
 * Props for the AccessControl component
 *
 * @template T - Type that extends AuthUser
 */
interface AccessControlProps<T extends AuthUser = AuthUser> extends UserAccessControl<T> {
    /**
     * Content to render if the user has access
     */
    children: ReactNode;

    /**
     * Content to render if the user doesn't have access
     * @default null
     */
    fallback?: ReactNode;
}

/**
 * Component that conditionally renders content based on user access
 * Uses the access control configuration from the AccessControlProvider context
 *
 * @template T - Type that extends AuthUser
 * @param {AccessControlProps<T>} props - Component props
 * @returns {ReactNode} Either children or fallback based on access check
 */
const AccessControl = <T extends AuthUser = AuthUser>({
    roles = [],
    permissions = [],
    attributes = {},
    children,
    fallback = null,
}: AccessControlProps<T>): ReactNode => {
    const { userRoles, userPermissions, userAttributes } = useAccessControl<T>();

    const isAuthorized =
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 || hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 || hasAttribute(userAttributes, attributes));

    return isAuthorized ? children : fallback;
};

export default AccessControl;
