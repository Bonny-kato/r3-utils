import {
    AccessControlConfig,
    AuthUser,
    RoleNames,
    UniquePermissions,
    UserAttribute,
} from "./type";

/**
 * Generates the access control configuration for a user based on their roles and permissions.
 * This is the entry point for access control.
 *
 * @template T - Type that extends AuthUser
 * @param {T | undefined} user - The user's information.
 * @returns {AccessControlConfig<T>} The user's access control configuration, which includes roles, permissions, and attributes.
 */
export const generateUserAccessControlConfig = <T extends AuthUser>(
    user?: T
): AccessControlConfig<T> => {
    const userRoles = user
        ? (user.roles.map((role) => role.name.toLowerCase()) as RoleNames<T>[])
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
              role.permissions.map((permission) => permission.toLowerCase())
          ) as UniquePermissions<T>[])
        : [];

    return {
        userAttributes,
        userPermissions,
        userRoles,
    };
};

/**
 * Type for the generateUserAccessControlConfig function
 * Allows consumers to provide their own user type that extends AuthUser
 */
export type GenerateAccessControlConfigFunc<T extends AuthUser> = (
    user?: T
) => AccessControlConfig<T>;
