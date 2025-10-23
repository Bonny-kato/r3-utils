import { ReactNode } from "react";
import { checkIfAuthorized } from "./access-control-helpers";
import { useAccessControl } from "./access-control-provider";
import {
    AccessControlStrictnessOptions,
    AuthUser,
    UserAccessControl,
} from "./type";

/**
 * Props for the AccessControl component
 *
 * @template T - Type that extends AuthUser
 */
interface AccessControlProps<T extends AuthUser = AuthUser>
    extends UserAccessControl<T> {
    /**
     * Content to render if the user has access
     */
    children: ReactNode;

    /**
     * Content to render if the user doesn't have access
     * @default null
     */
    fallback?: ReactNode;

    strictness?: AccessControlStrictnessOptions;
}

/**
 * React component that conditionally renders content based on user access control.
 * Checks if the current user has the required roles, permissions, and attributes.
 *
 * @template T - Type that extends AuthUser
 * @param props - The access control props
 * @param props.roles - Array of role names required for access (default: [])
 * @param props.permissions - Array of permission strings required for access (default: [])
 * @param props.attributes - Object of attribute key-value pairs required for access (default: {})
 * @param props.children - Content to render if the user has access
 * @param props.fallback - Content to render if the user doesn't have access (default: null)
 * @param props.strictness - Strictness options for each access type (default: {})
 * @returns The children if authorized, fallback if not authorized
 *
 * @example
 * ```tsx
 * // Basic usage - show content only to admins
 * <AccessControl roles={['admin']}>
 *   <AdminPanel />
 * </AccessControl>
 *
 * // With fallback content
 * <AccessControl
 *   permissions={['write:posts']}
 *   fallback={<div>You don't have permission to edit posts</div>}
 * >
 *   <PostEditor />
 * </AccessControl>
 *
 * // With attribute-based access and strict checking
 * <AccessControl
 *   attributes={{ department: 'engineering', isActive: true }}
 *   strictness={{ attributes: true }}
 *   fallback={<div>Access restricted to active engineering staff</div>}
 * >
 *   <EngineeringTools />
 * </AccessControl>
 * ```
 */
const AccessControl = <T extends AuthUser = AuthUser>({
    roles = [],
    permissions = [],
    attributes = {},
    children,
    fallback = null,
    strictness = {} as AccessControlStrictnessOptions,
}: AccessControlProps<T>): ReactNode => {
    const accessControl = useAccessControl<T>();

    const isAuthorized = checkIfAuthorized(
        accessControl,
        {
            attributes,
            permissions,
            roles,
        },
        strictness
    );

    return isAuthorized ? children : fallback;
};

export default AccessControl;
