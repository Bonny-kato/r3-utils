import { AccessControlConfig, AuthUser, UserAccessControl } from './type';
import { hasAttribute, hasPermission, hasRole } from './access-control-helpers';

/**
 * Configuration for a menu item with access control requirements
 * 
 * @template T - Type that extends AuthUser
 */
export interface MenuItemConfig<T extends AuthUser = AuthUser> {
    /**
     * Access control requirements for this menu item
     */
    accessControl: UserAccessControl<T>;

    /**
     * Link or path to the menu item
     */
    link: string;
}

/**
 * Access status for a menu item
 */
export interface MenuItemAccess {
    /**
     * Whether the user has access to this menu item
     */
    hasAccess: boolean;

    /**
     * Link or path to the menu item if accessible
     */
    link: string;
}

/**
 * Configuration for a menu with multiple sections
 * @template S - Type that extends string, representing the menu section names
 * @template T - Type that extends AuthUser
 */
export type MenuConfig<S extends string, T extends AuthUser = AuthUser> = Record<S, MenuItemConfig<T>[]>;

/**
 * Checks if the user has the required access for a menu item
 *
 * @template T - Type that extends AuthUser
 * @param {AccessControlConfig<T>} accessControlConfig - The access control configuration
 * @param {UserAccessControl<T>} accessControl - The access control requirements
 * @returns {boolean} Whether the user has the required access
 */
const checkRequiredAccess = <T extends AuthUser>(
    accessControlConfig: AccessControlConfig<T>,
    { roles = [], permissions = [], attributes = {} }: UserAccessControl<T>
): boolean => {
    const { userPermissions, userAttributes, userRoles } = accessControlConfig;

    return (
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 || hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 || hasAttribute<T>(userAttributes, attributes))
    );
};

/**
 * Determines the accessibility of menu items based on the user's access control configuration.
 *
 * @template T - Type that extends AuthUser
 * @param {AccessControlConfig<T>} accessControlConfig - The access control settings for the user, including permissions, attributes, and roles.
 * @param {MenuItemConfig<T>[]} menuAccessConfigs - Array of menu item configurations that define access control requirements.
 * @returns {MenuItemAccess} - An object containing access status and the link of an accessible menu item if available.
 */
const getMenuAccess = <T extends AuthUser>(
    accessControlConfig: AccessControlConfig<T>,
    menuAccessConfigs: MenuItemConfig<T>[]
): MenuItemAccess => {
    const accessibleMenuItem = menuAccessConfigs.find(({ accessControl }) =>
        checkRequiredAccess<T>(accessControlConfig, accessControl)
    );

    return {
        hasAccess: !!accessibleMenuItem,
        link: accessibleMenuItem ? accessibleMenuItem.link : '',
    };
};

/**
 * Generates a record of menu item access based on the provided access control and menu configurations.
 *
 * @template S - A generic type parameter that extends string, representing the keys in the menu configuration.
 * @template T - Type that extends AuthUser
 * @param {AccessControlConfig<T>} accessControlConfig - Configuration object that defines access control rules.
 * @param {MenuConfig<S, T>} menuConfig - Configuration object that defines the menu structure and items.
 * @returns {Record<S, MenuItemAccess>} A record where each key corresponds to a menu item and the value represents access details for that item.
 */
export const generateMenuAccess = <S extends string, T extends AuthUser = AuthUser>(
    accessControlConfig: AccessControlConfig<T>,
    menuConfig: MenuConfig<S, T>
): Record<S, MenuItemAccess> => {
    return Object.entries(menuConfig).reduce(
        (acc, [key, configs]) => {
            acc[key as S] = getMenuAccess<T>(accessControlConfig, configs as MenuItemConfig<T>[]);
            return acc;
        },
        {} as Record<S, MenuItemAccess>
    );
};
