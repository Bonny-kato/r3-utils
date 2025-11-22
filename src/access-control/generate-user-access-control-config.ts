import {
    AccessControlConfig,
    AuthUser,
    RoleNames,
    UniquePermissions,
    UserAttribute,
} from "./type";

/**
 * Generates an access control configuration from a user object.
 * Extracts and processes the user's roles, permissions, and attributes into a format
 * suitable for access control evaluation.
 *
 * @template T - Type that extends AuthUser
 * @param user - The user object containing roles and other attributes (optional)
 * @returns Access control configuration with processed user data
 *
 * @example
 * ```typescript
 * const user: AppUser = {
 *   id: '123',
 *   name: 'John Doe',
 *   department: 'engineering',
 *   isActive: true,
 *   roles: [
 *     { name: 'ADMIN', permissions: ['read:users', 'write:users'] },
 *     { name: 'EDITOR', permissions: ['read:posts', 'write:posts'] }
 *   ]
 * };
 *
 * const config = generateUserAccessControlConfig(user);
 * // Result: {
 * //   userRoles: ['admin', 'editor'],
 * //   userPermissions: ['read:users', 'write:users', 'read:posts', 'write:posts'],
 * //   userAttributes: { id: '123', name: 'John Doe', department: 'engineering', isActive: true }
 * // }
 *
 * // Handle case with no user (returns empty configuration)
 * const emptyConfig = generateUserAccessControlConfig();
 * // Result: { userRoles: [], userPermissions: [], userAttributes: {} }
 * ```
 */
export const generateUserAccessControlConfig = <T extends AuthUser>(
    user?: T
): AccessControlConfig<T> => {
    // Todo validate the shape of auth user
    const userRoles = user
        ? (user.roles.map((role) => role.name) as RoleNames<T>[])
        : [];

    const userAttributes: UserAttribute<T> = user
        ? Object.entries(user)
              .filter(([key]) => key !== "roles")
              .reduce((acc, [key, value]) => {
                  return { ...acc, [key]: value };
              }, {} as UserAttribute<T>)
        : {};

    const userPermissions = user
        ? (user.roles.flatMap((role) =>
              role.permissions.map((permission) => permission)
          ) as UniquePermissions<T>[])
        : [];

    return {
        userAttributes,
        userPermissions,
        userRoles,
    };
};
