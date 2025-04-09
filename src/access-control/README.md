# Access Control in React Based Apps

Following user authentication, implementing access control in a React app involves managing and restricting user
permissions to access certain components or pages based on their roles, attributes, and permissions. This ensures that
users can only access resources they're authorized to handle or perform actions permitted for them. Two common types of
access control are RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control).

## Introduction

### Role-Based Access Control (RBAC)

In this form of access control, user's access is managed based on their roles. For example, only administrators may view
settings, or only HR personnel can view staff details. This approach is straightforward to implement but has limitations
regarding flexibility. For instance, consider a scenario with two administrators from separate locations, each needing
to manage users within their location. Achieving this with RBAC alone could be challenging, if not impossible.

### Attribute-Based Access Control (ABAC)

ABAC offers more flexibility by enabling you to specify access controls based on a combination of attributes. These
might include roles but can also encompass factors like the user's department, access time, location, or any other user
or environmental characteristics.

## Motivation

I was tasked with implementing access control in a Remix application that needed to control user access based on roles,
permissions, and attributes such as user types. I needed a solution compatible in both server and browser environments
since Remix is a full-stack framework. After exploring existing npm solutions, I came
across [react-abac](https://www.npmjs.com/package/react-abac). However, this package seemed limited to client-side use
and didn't suit my API preferences. As a result, I developed a comprehensive suite that operates efficiently in both
environments with a simple yet robust API. Enough background; let me walk you through my implementation.

## API

The access control suite includes the following APIs:

### Access Control Utilities

These are a set of utilities that determine whether an authenticated user meets specific conditions to be considered
authorized. Each utility is self-documented and intended to provide clear understanding of its functionality.

```typescript
// app/provider/access-control-utils.ts
import { AuthUserSchemaWithRoleType } from "~/api/login/auth-user-schema";

/**
 * Checks if the user possesses any of the specified roles.
 *
 * @param {string[]} userRoles - The roles assigned to the user.
 * @param {string[]} requiredRoles - The roles to validate against.
 * @returns {boolean} - True if the user holds any of the required roles, false otherwise.
 */
export const hasRole = (userRoles: string[], requiredRoles: string[]) => {
    return requiredRoles.some((role) => userRoles.includes(role));
};

/**
 * Validates if the user holds any of the necessary permissions.
 *
 * @param {string[]} userPermissions - The permissions assigned to the user.
 * @param {string[]} requiredPermissions - The permissions to validate against.
 * @returns {boolean} - True if the user possesses any of the required permissions, false otherwise.
 */
export const hasPermission = (
    userPermissions: string[],
    requiredPermissions: string[]
): boolean => {
    return requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
    );
};

/**
 * Represents user attributes as a record with generic key and value types.
 */
export type UserAttribute = Partial<
    Omit<AuthUserSchemaWithRoleType["data"], "role" | "token" | "id">
> &
    Record<string, boolean | number | string>;

/**
 * Validates if the user possesses the specified attributes.
 *
 * @param {UserAttribute} userAttributes - The attributes assigned to the user.
 * @param {UserAttribute} requiredAttributes - The attributes to validate against.
 * @returns {boolean} - True if the user possesses all the required attributes, false otherwise.
 */
export const hasAttribute = (
    userAttributes: UserAttribute,
    requiredAttributes: UserAttribute
): boolean => {
    return Object.keys(requiredAttributes).every(
        (key) => userAttributes[key] === requiredAttributes[key]
    );
};
```

**Note**
Ensure correct authentication user type based on your project. Here, the auth user type is `AuthUserSchemaWithRoleType`,
provided to the `UserAttribute` type to ensure type-safety when defining user attributes.

### generateUserAccessControlConfig

`generateUserAccessControlConfig` serves as the entry point for access control. It accepts an authenticated user object
and manipulates it to generate access control configuration, including `permissions`, `roles`, and `attributes`. This
function runs in both environments. You can customize this function to manipulate auth user information and return an
access config of type `AccessControlConfig`, depending on the auth user object structure. Only this function requires
modification based on your auth user structure; the rest of the API works out of the box unless you wish to extend
functionality.

```typescript
import { AuthUserSchemaWithRoleType } from "~/api/login/auth-user-schema";
import { UserAttribute } from "~/providers/access-control/access-control-helpers";
import { AccessControlConfig } from "~/providers/access-control/access-control-provider";
import { SexType } from "~/utils/zod-common";

/**
 * Generates the access control configuration for a user based on their roles, permissions, and attributes.
 *
 * @param {Omit<AuthUserType, "token">} authUser - The authenticated user's information excluding the token.
 * @returns {AccessControlConfig} The user's access control configuration, which includes roles, permissions, and attributes.
 */
export const generateUserAccessControlConfig = (
    authUser?: AuthUserSchemaWithRoleType["data"]
): AccessControlConfig => {
    const userRoles = authUser
        ? authUser.role.map((role) => role.name.toLowerCase())
        : [];

    const userAttributes: UserAttribute = {
        sex: authUser?.sex as SexType,
    };

    const userPermissions = authUser
        ? authUser.role.flatMap((role) =>
            role.permissions.map((permission) => permission.toLowerCase())
        )
        : [];

    return {
        userAttributes,
        userPermissions,
        userRoles,
    };
};
```

### AccessControlProvider

This is a React context provider that encapsulates your app, providing authenticated user information to other access
control functionalities. It also includes a hook to access this context throughout your application.

```typescript
import { createContext, FC, ReactNode, useContext } from "react";
import { UserAttribute } from "~/providers/access-control/access-control-helpers";

export interface AccessControlConfig {
    userPermissions: string[];
    userAttributes: UserAttribute;
    userRoles: string[];
}

const AccessControlContext = createContext<AccessControlConfig | null>(null);

export const AccessControlProvider: FC<{
    accessControlConfig: AccessControlConfig;
    children: ReactNode;
}> = ({ accessControlConfig, children }) => {
    return (
        <AccessControlContext.Provider value={accessControlConfig}>
            {children}
        </AccessControlContext.Provider>
    );
};

/**
 * Custom hook to access the AccessControlContext.
 *
 * @throws Will throw an error if used outside of an AccessControlProvider.
 * @returns {AccessControlConfig} - The access control configuration.
 */
export const useAccessControl = () => {
    const context = useContext(AccessControlContext);
    if (!context)
        throw new Error(
            "useAccessControl should be used inside AccessControlProvider"
        );
    return context;
};
```

#### Usage

Wrap your entire application with the `AccessControlProvider` to enable access control capabilities within your app.

```typescript
export const AuthLayout: FC<{
    children: ReactNode;
    authUser?: AuthUserSchemaWithRoleType["data"];
}> = ({ children, authUser }) => {

    const accessControlConfig = generateUserAccessControlConfig(authUser);
    return (
        <AccessControlProvider accessControlConfig={accessControlConfig}>
            {children}
        </AccessControlProvider>
    );
};
```

### useAccessControl

A custom hook to access the auth user access information through the AccessControlProvider context. It returns the auth
user's permissions, roles, and attributes generated from `generateUserAccessControlConfig`. It will throw an error if
used outside AccessControlProvider. This hook is internally used with other APIs but can be handy for debugging, e.g.,
checking which permissions, roles, and attributes an auth user has.

#### Usage

```typescript
const MyComponent = () => {
    const { userRoles, userPermissions, userAttributes } = useAccessControl();
    console.log(userRoles, userPermissions, userAttributes);

    return (
        <div>
            {/* The rest of your code */}
        </div>
    )
}
```

### useHasAccess

This hook determines if a user has access based on a provided access control configuration. It is especially useful in
JavaScript environments where a React component isn't employed or when creating/extending custom access control.

```typescript
/**
 * Custom hook to determine if the user has the specified roles, permissions, or attributes.
 *
 * @param {Object} props - The properties object.
 * @param {string[]} [props.roles=[]] - The roles to verify against the user's roles.
 * @param {string[]} [props.permissions=[]] - The permissions to check against the user's permissions.
 * @param {UserAttribute} [props.attributes={}] - The attributes to validate against the user's attributes.
 * @returns {boolean} - Returns true if the user has the required access, false otherwise.
 */
export const useHasAccess = (
    {
         roles = [],
         permissions = [],
         attributes = {},
     }: UserAccessControl): boolean => {
    
        const { userRoles, userPermissions, userAttributes } = useAccessControl();

        return (
            (roles.length === 0 || hasRole(userRoles, roles)) &&
            (permissions.length === 0 ||
                hasPermission(userPermissions, permissions)) &&
            (Object.keys(attributes).length === 0 ||
                hasAttribute(userAttributes, attributes))
        );
    };
```

#### Usage

##### Example 1 (Simple)

```typescript
const UserDetails = () => {
    // It's not mandatory to pass all props; even one, e.g., to check just role, you can simply pass role
    const canEditUser = useHasAccess({
        roles: ["admin"], 
        permissions: ["can-edit-user"],
        attributes: { location: "Dar es Salaam" }
    });

    return (
        <div>
            {canEditUser && (
                <button>Edit User</button>
            )}
            {/* The rest of your code */}
        </div>
    )
}
```

##### Example 2 (Extending Functionality)

```typescript
const useQueryData = (url, options) => {
    const [data, setData] = useState();
    const enabled  = useHasAccess(options.accessControl);
    
    const fetchData = async () => {
        // ...
        try {
            const res = await fetch(url);
            const _data = await res.json();
            setData(_data);
        }
        catch (e) {
            console.log("error", e);
        }
    };

    useEffect(() => {
        if (enabled) fetchData();
    }, [options]);
    
    return data;
};

// Usage
useQueryData("/users", { accessControl: { roles: ["admin"] } });
```

### AccessControl

React component that renders children only if the authenticated user is authorized, based on the provided access
control. Otherwise, it renders nothing or a fallback UI if provided. This component has the same capabilities as
`useHasAccess` but only works in jsx environments. Additionally, if no access control props are provided, it will render
the children by default, which is handy when you are not yet established on the kind of access control the backend
supports, so you can wrap your component without providing anything, and it will still render.

```typescript
import { FC, ReactNode } from "react";
import {
    hasAttribute,
    hasPermission,
    hasRole,
} from "~/providers/access-control/access-control-helpers";
import { useAccessControl } from "~/providers/access-control/access-control-provider";
import { UserAccessControl } from "~/providers/access-control/use-has-access";

interface Props extends UserAccessControl {
    children: ReactNode;
    fallback?: ReactNode;
}

const AccessControl: FC<Props> = ({
    roles = [],
    permissions = [],
    attributes = {},
    children,
    fallback = null,
}) => {
    const {
        userRoles,
        userPermissions,
        userAttributes,
    } = useAccessControl();

    const isAuthorized =
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 ||
            hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 ||
            hasAttribute(userAttributes, attributes));

    return isAuthorized ? children : fallback;
};

export default AccessControl;
```

#### Usage

```typescript
const UserDetails = () => {

    return (
        <div>
            {/* Passing all props is not mandatory; e.g., if you want to check just role, then you can pass just role */}
            <AccessControl
                roles={["admin"]} 
                permissions={["can-edit-user"]} 
                attributes={{ location: "Dar es Salaam" }}
            >
                <button>Edit User</button>
            </AccessControl>
            
            {/* The rest of your code */}
        </div>
    )
}
```

### requireAccess

A Remix-specific utility function that runs on the server to authorize user access to certain routes. Unlike other APIs
that require just access control config of the type UserAccessControl, this function also requires a `request` object to
access auth user information. It can be used to protect routes and will throw an unauthorized error if the user isn't
authorized. The error will be caught in the nearest error boundary.

```typescript
import { AuthUserSchemaWithRoleType } from "~/api/login/auth-user-schema";
import {
    hasAttribute,
    hasPermission,
    hasRole,
} from "~/providers/access-control/access-control-helpers";
import { generateUserAccessControlConfig } from "~/providers/access-control/generate-user-access-control-config";
import { UserAccessControl } from "~/providers/access-control/use-has-access";
import { throwUnauthorizedError } from "~/utils/request.server";
import { requireUser } from "~/utils/session.server";

/**
 * Verifies that the requesting user has the necessary access based on roles, permissions, and attributes.
 *
 * @param {Request} request - The incoming request object.
 * @param {Object} userAccessControl - Access control requirements.
 * @param {string[]} [userAccessControl.roles=[]] - List of roles that are allowed access.
 * @param {string[]} [userAccessControl.permissions=[]] - List of permissions required for access.
 * @param {Object} [userAccessControl.attributes={}] - Additional attributes required for access.
 *
 * @returns {Promise<AuthUserType>} The authenticated user object if access is granted.
 *
 * @throws Will throw UnauthorizedError if the user doesn't have the necessary access.
 */
export const requireAccess = async (
    request: Request,
    { roles = [], permissions = [], attributes = {} }: UserAccessControl
): Promise<AuthUserSchemaWithRoleType["data"]> => {
    //⬇️ Custom utility to retrieve auth user info from cookie; you can provide your own implementation
    const authUser = await requireUser(request);

    // ⬇️ The same function used to generate access control config on the client
    const { userRoles, userPermissions, userAttributes } =
        generateUserAccessControlConfig(authUser); 

    const hasAccess =
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 ||
            hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 ||
            hasAttribute(userAttributes, attributes));

    //⬇️ Custom utility to throw unauthorized response; you can make it just as simple as returning `json({ message }, { status: 403 });`
    if (!hasAccess) throwUnauthorizedError();

    return authUser;
};
```

That's all! These are the APIs you need to manage access control in a React/Remix application confidently. What I find
advantageous about these APIs is their reusability. Only one area needs customization, treated as the entry point, and
that is `generateUserAccessControlConfig`. This makes it easier to reuse in other projects, even enabling you to create
an npm package if desired. But wait—I can't leave you just like that; there's an additional API, albeit very
opinionated, for managing menus and tabs based on access control. Here we go.

### generateMenuAccess

A self-documented utility function that helps manage menu or tab access based on which type of user is authorized.

```typescript
import {
    hasAttribute,
    hasPermission,
    hasRole,
} from "~/providers/access-control/access-control-helpers";
import { AccessControlConfig } from "~/providers/access-control/access-control-provider";
import { UserAccessControl } from "~/providers/access-control/use-has-access";

type MenuItemConfig = {
    accessControl: UserAccessControl;
    link: string;
};

type MenuItemAccess = {
    hasAccess: boolean;
    link: string;
};

export type MenuConfig<T extends string> = Record<T, MenuItemConfig[]>;

const checkRequiredAccess = (
    accessControlConfig: AccessControlConfig,
    { roles = [], permissions = [], attributes = {} }: UserAccessControl
) => {
    const { userPermissions, userAttributes, userRoles } = accessControlConfig;

    return (
        (roles.length === 0 || hasRole(userRoles, roles)) &&
        (permissions.length === 0 ||
            hasPermission(userPermissions, permissions)) &&
        (Object.keys(attributes).length === 0 ||
            hasAttribute(userAttributes, attributes))
    );
};

/**
 * Determines the accessibility of menu items based on the user's access control configuration.
 *
 * @param {AccessControlConfig} accessControlConfig - The access control settings for the user, including permissions, attributes, and roles.
 * @param {MenuItemConfig[]} menuAccessConfigs - Array of menu item configurations that define access control requirements.
 * @returns {MenuItemAccess} - An object containing access status and the link of an accessible menu item if available.
 */
const getMenuAccess = (
    accessControlConfig: AccessControlConfig,
    menuAccessConfigs: MenuItemConfig[]
): MenuItemAccess => {
    const accessibleMenuItem = menuAccessConfigs.find(({ accessControl }) =>
        checkRequiredAccess(accessControlConfig, accessControl)
    );

    return {
        hasAccess: !!accessibleMenuItem,
        link: accessibleMenuItem ? accessibleMenuItem.link : "",
    };
};

/**
 * Generates a record of menu item access based on the provided access control and menu configurations.
 *
 * @param {AccessControlConfig} accessControlConfig - Configuration object that defines access control rules.
 * @param {MenuConfig<T>} menuConfig - Configuration object that defines the menu structure and items.
 * @returns {Record<T, MenuItemAccess>} A record where each key corresponds to a menu item and the value represents access details for that item.
 * @template T - A generic type parameter that extends string, representing the keys in the menu configuration.
 */
export const generateMenuAccess = <T extends string>(
    accessControlConfig: AccessControlConfig,
    menuConfig: MenuConfig<T>
): Record<T, MenuItemAccess> => {
    return Object.entries(menuConfig).reduce(
        (acc, [key, configs]) => {
            acc[key as T] = getMenuAccess(
                accessControlConfig,
                configs as MenuItemConfig[]
            );
            return acc;
        },
        {} as Record<T, MenuItemAccess>
    );
};

```

#### Usage

```typescript
import { MenuConfig } from "~/providers/access-control/generate-menu-access-control";

export const SETTINGS_BASE_URL = "/dashboard/settings";

type SettingsMenuType =
    | "dashboard"
    | "zones"
    | "branches";


const useManageSettingsMenus = () => {
     const settingsMenuConfig: MenuConfig<SettingsMenuType> = {
        dashboard: [
            {
                accessControl: {
                    roles: ["admin"]
                },
                link: `${SETTINGS_BASE_URL}/admin`,
            },
            {
                accessControl: {
                    roles: ["hr"]
                },
                link: `${SETTINGS_BASE_URL}/hr`,
            },
        ],
        zones: [
            {
                accessControl: {},
                link: `${SETTINGS_BASE_URL}/zones`,
            },
        ],
    };

    const accessControlConfig = useAccessControl();

    const settingsAccess = generateMenuAccess(
        accessControlConfig,
        settingsMenuConfig
    );
    
    return [
        ...addObjectIfConditionMet(settingsAccess.dashboard.hasAccess, {
            name: "Dashboard",
            url: settingsAccess.userProfile.link!,
        }),
        // Other menus
    ];
}

// settings/layout.tsx
const SettingLayout = () => {
    const settingsMenus = useManageSettingsMenus();
    return (
        <>
        {/* Other layouts */}
            <div>
                {settingsMenus.map((menu) => (
                    <SettingMenu key={menu.name} menu={menu} />
                ))}
            </div>
        </>
    )
}
```

#### Explanation

Each menu/tab is defined as an array of objects with their respective access controls and links. This configuration is
passed to `generateMenuAccess`, which iterates through each menu/tab and their associated configuration arrays to
determine which configurations align with the authenticated user's access control, marking the first match as
`hasAccess`.

This is particularly useful in scenarios where users all access the dashboard, but the dashboard is personalized
according to their profiles. This ensures users are redirected to their personalized dashboards when clicking on the
dashboard menu from the sidebar, justifying why each menu/tab features an array for defining `access control` and the
`link` to redirect.

Thank you for reading this far. Hopefully, it will be useful and save you some hours. If you have any suggestions or
questions, feel free to comment below.

### Special Thanks

Thank you [Jerry Lussato](https://github.com/jerrylusato), [Joseph Makwaya](https://github.com/astrojose),
and [Jackon Twalipo](https://github.com/twalipo) for contributing to this.
