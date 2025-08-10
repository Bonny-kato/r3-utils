import { typedKeys } from "../utils/typed-keys";
import { checkIfAuthorized } from "./access-control-helpers";
import {
    AccessControlConfig,
    AccessControlStrictnessOptions,
    AuthUser,
    UserAccessControl,
} from "./type";

/**
 * Configuration for a menu item with access control requirements
 *
 * @template T - Type that extends AuthUser
 */
export interface MenuItemConfig<TUser extends AuthUser = AuthUser> {
    /**
     * Access control requirements for this menu item
     */
    accessControl: UserAccessControl<TUser>;
    /**
     * Link or path to the menu item
     */
    link: string;
    /**
     * Controls how access requirements are validated. When true, all items in the respective
     * category (roles/permissions/attributes) must be present. When false, only one item needs
     * to match. Uses Array.every() for true and Array.some() for false.
     *
     * @default {
     *     attributes: false,
     *     permissions: false,
     *     roles:false
     * }
     */
    strictness?: AccessControlStrictnessOptions;
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
export type MenuConfig<
    TMenu extends string,
    TUser extends AuthUser = AuthUser,
> = Record<TMenu, MenuItemConfig<TUser>[]>;

type MenuAccessResult<TMenu extends string> = Record<TMenu, MenuItemAccess>;

/**
 * Internal helper function that determines access for a specific menu item configuration.
 * Finds the first menu item that the user has access to based on their access control configuration.
 *
 * @template TUser - Type that extends AuthUser
 * @param userAccess - The user's access control configuration
 * @param menuItemConfig - Array of menu item configurations to check against
 * @returns Object containing access status and link information
 */
const getMenuAccess = <TUser extends AuthUser>(
    userAccess: AccessControlConfig<TUser>,
    menuItemConfig: MenuItemConfig<TUser>[]
): MenuItemAccess => {
    const accessibleMenuItem = menuItemConfig.find(
        ({ accessControl, strictness }) => {
            return checkIfAuthorized(userAccess, accessControl, strictness);
        }
    );

    return {
        hasAccess: !!accessibleMenuItem,
        link: accessibleMenuItem ? accessibleMenuItem.link : "",
    };
};

/**
 * Generates menu access information for all menu sections based on user's access control configuration.
 * This function evaluates each menu section and determines which items the user can access.
 *
 * @template TMenu - String literal type representing menu section names
 * @template TUser - Type that extends AuthUser
 * @param accessControlConfig - The user's access control configuration containing roles, permissions, and attributes
 * @param menuConfig - Configuration object mapping menu section names to their respective menu items
 * @returns Object mapping each menu section to its access status and available link
 *
 * @example
 * ```typescript
 * const menuConfig: MenuConfig<'dashboard' | 'admin' | 'reports', AppUser> = {
 *   dashboard: [
 *     { accessControl: { roles: ['user'] }, link: '/dashboard' }
 *   ],
 *   admin: [
 *     { accessControl: { roles: ['admin'] }, link: '/admin' },
 *     { accessControl: { permissions: ['admin:read'] }, link: '/admin/readonly' }
 *   ],
 *   reports: [
 *     { accessControl: { attributes: { department: 'finance' } }, link: '/reports' }
 *   ]
 * };
 *
 * const userAccess = generateUserAccessControlConfig(currentUser);
 * const menuAccess = generateMenuAccess(userAccess, menuConfig);
 *
 * // Result: { dashboard: { hasAccess: true, link: '/dashboard' }, admin: { hasAccess: false, link: '' }, ... }
 * ```
 */
export const generateMenuAccess = <
    TMenu extends string,
    TUser extends AuthUser = AuthUser,
>(
    accessControlConfig: AccessControlConfig<TUser>,
    menuConfig: MenuConfig<TMenu, TUser>
) => {
    const menuAccessResult = {} as MenuAccessResult<TMenu>;

    for (const menu of typedKeys(menuConfig)) {
        menuAccessResult[menu] = getMenuAccess<TUser>(
            accessControlConfig,
            menuConfig[menu]
        );
    }

    return menuAccessResult;
};
