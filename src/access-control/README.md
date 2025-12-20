# Access Control in React Based Apps

Following user authentication, implementing access control in a React app involves managing and restricting user
permissions to access certain components or pages based on their roles, attributes, and permissions. This ensures that
users can only access resources they're authorized to handle or perform actions permitted for them. Two common types of
access control are RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control).

## Introduction

### Role-Based Access Control (RBAC)

In this form of access control, a user's access is managed based on their roles. For example, only administrators may
view
settings, or only HR personnel can view staff details. This approach is straightforward to implement but has limitations
regarding flexibility. For instance, consider a scenario with two administrators from separate locations, each needing
to manage users within their location. Achieving this with RBAC alone could be challenging, if not impossible.

### Attribute-Based Access Control (ABAC)

ABAC offers more flexibility by enabling you to specify access controls based on a combination of attributes. These
might include roles but can also encompass factors like the user's department, access time, location, or any other user
or environmental characteristics.

## Features

- Strongly typed, generic APIs. Most functions now accept a generic T extends AuthUser for end-to-end type safety.
- Built-in react component, context, and hooks for managing access control.
- Exported low-level utilities for extending access control.
- Works with both client and server-side.
- Supports both ABAC and RBAC.
- Support negation access control via `not` property.
- Supports strictness checks via `requireAll` property
- **Predicate functions for dynamic attribute checks** (e.g., age >= 18, date-based access, numeric thresholds)
- Built-in support for menus and tabs.
- Self-documented, easy to understand, and extend.
- Factory function (`createAccessControl`) to generate type-safe hooks, components, and helpers bound to your
  app-specific user type

## APIs

### Low-level utilities

These utilities determine whether an authenticated user meets specific conditions (roles, permissions, attributes), are
used internally to power other APIs, and can also be useful when you need to extend access control functionality to
suit your specific use case.

#### hasRole

A low-level utility that checks if a user has a specific role. It accepts three parameters: array of `userRoles`, array
of `requiredRoles`, and `options` of type `AccessCheckOptions`

Example

```ts
import { hasRole } from "r3-utils/access-control";

const userRoles = ["admin"];
hasRole<AppUser>(userRoles, ["admin"]); // true

// with options
const userRoles2 = ["viewer"];
hasRole<AppUser>(userRoles2, ["admin", "editor"], { requireAll: true, not: true }); // false since user does not have any of the roles

// legacy options with strictness check
const userRoles3 = ["admin"];
hasRole<AppUser>(userRoles3, ["admin", "editor"], false); // true since user has any of the roles
```

#### hasPermission

A low-level utility that checks if a user has a specific permission. It accepts three parameters: array of
`userPermissions`, array of `requiredPermissions`, and `options` of type `AccessCheckOptions`

Example

```ts
import { hasPermission } from "r3-utils/access-control";

const userPermissions = ["create:user", "delete:products"];
hasPermission<AppUser>(userPermissions, ["create:user"]); // true

// with options
const userPermissions2 = ["delete:users"];
hasPermission<AppUser>(userPermissions2, userPermissions, { requireAll: true, not: true }); // false since user does not have any of the permissions   

// legacy options with strictness check
const userPermissions3 = ["can:edit-user", "can:delete-user"];
hasPermission<AppUser>(userPermissions3, ["can:delete-user", "can:create-products"], false); // true since user has any of the permissions   
```

#### hasAttribute

A low-level utility that checks if a user has specific attributes. It accepts three parameters: `userAttributes` object,
`requiredAttributes` (object or predicate function), and `options` of type `AccessCheckOptions`.

**Supports three formats for `requiredAttributes`:**

1. **Plain attribute object** - Simple exact value matching
2. **Predicate function** – Dynamic checks for complex logic (e.g., age >= 18)

Example

```ts
import { hasAttribute } from "r3-utils/access-control";

const userAttributes = { age: 25, department: "engineering", isActive: true };

// Simple exact match
hasAttribute(userAttributes, { department: "engineering" }); // true

// With options
hasAttribute(userAttributes, { department: "engineering", isActive: true }, { requireAll: true }); // true

// Predicate function for dynamic checks
hasAttribute(userAttributes, (user) => user.age >= 18); // true
hasAttribute(userAttributes, (user) => user.age >= 30); // false

// Complex business logic with predicate
hasAttribute(userAttributes, (user) =>
    user.department === "engineering" && user.age >= 21
); // true
```

**Note:** When using a predicate function, the `options` parameter should not be provided; otherwise, you'll get a type
error. The predicate has full control over the access decision, so features like `not` or `requireAll` should be handled
within the predicate itself.

### generateUserAccessControlConfig

`generateUserAccessControlConfig` serves as the entry point for access control. It accepts an authenticated user object
and manipulates it to generate access control configuration, including `permissions`, `roles`, and `attributes`. This
function runs in both environments. You can customize this function to manipulate auth user information and return an
access config of type `AccessControlConfig`, depending on the auth user object structure. Only this function requires
modification based on your auth user structure; the rest of the API works out of the box unless you wish to extend
functionality.

```typescript
import {
    generateUserAccessControlConfig,
    type AuthUser,
    type AccessControlConfig,
    type UserAttribute,
} from "r3-utils/access-control";

// Define your application's user shape extending AuthUser
interface AppUser extends AuthUser {
    name: string;
    department?: string;
    isActive?: boolean;
}

// Example usage
const config: AccessControlConfig<AppUser> = generateUserAccessControlConfig<AppUser>({
    id: "123",
    name: "Jane",
    department: "engineering",
    roles: [
        { name: "ADMIN", permissions: ["read:users", "write:users"] },
        { name: "EDITOR", permissions: ["read:posts", "write:posts"] },
    ],
});
// userRoles are normalized to role names, userPermissions flatten role permissions,
// userAttributes contains all non-roles user fields.
```

### AccessControlProvider

This is a React context provider that encapsulates your app, providing authenticated user information to other access
control functionalities. It also includes a hook to access this context throughout your application.

```typescript
import {
    AccessControlProvider,
    useAccessControl,
    generateUserAccessControlConfig,
    type AuthUser,
} from "r3-utils/access-control";

interface AppUser extends AuthUser {
    name: string
}

export const AppRoot = ({ user, children }: { user?: AppUser; children: React.ReactNode }) => {
    const accessConfig = generateUserAccessControlConfig<AppUser>(user);
    return (
        <AccessControlProvider<AppUser> accessControlConfig = { accessConfig } >
            { children }
            < /AccessControlProvider>
    );
};
```

#### Usage

Wrap your entire application with the `AccessControlProvider` to enable access control capabilities within your app.

```typescript
// Wrap your app with AccessControlProvider and pass generateUserAccessControlConfig(user)
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
    return <div / >;
};
```

### useHasAccess

This hook determines if a user has access based on a provided access control configuration. It is especially useful in
JavaScript environments where a React component isn't employed or when creating/extending custom access control.

```typescript
import { useHasAccess, type AuthUser } from "r3-utils/access-control";

interface AppUser extends AuthUser {
    department?: string
}

const canEditUser = useHasAccess<AppUser>({
    roles: ["admin"],
    permissions: ["can-edit-user"],
    attributes: { department: "people" },
});
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
            { canEditUser && (
            <button>Edit
    User < /button>
)
}
    {/* The rest of your code */
    }
    </div>
)
    ;
};
```

##### Example 2 (Extending Functionality)

```typescript
const useQueryData = (url, options) => {
    const [data, setData] = useState();
    const enabled = useHasAccess(options.accessControl);

    const fetchData = async () => {
        // ...
        try {
            const res = await fetch(url);
            const _data = await res.json();
            setData(_data);
        } catch (e) {
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
import { AccessControl } from "r3-utils/access-control";

// Passing all props is not mandatory
<AccessControl
    roles = { ["admin"] }
permissions = { ["can-edit-user"] }
attributes = {
{
    department: "people"
}
}
>
<button>Edit
User < /button>
{/* ... */
}
</AccessControl>
```

#### Usage

```typescript
const UserDetails = () => {
    return (
        <div>
            {/* Passing all props is not mandatory; e.g., if you want to check just role, then you can pass just role */ }
        < AccessControl
    roles = { ["admin"] }
    permissions = { ["can-edit-user"] }
    attributes = {
    {
        location: "Dar es Salaam"
    }
}
>
    <button>Edit
    User < /button>
    < /AccessControl>

    {/* The rest of your code */
    }
    </div>
)
    ;
};
```

#### Using Predicate Functions

You can use predicate functions for dynamic attribute checks with both `AccessControl` component and `useHasAccess`
hook:

```tsx
// Age restriction with AccessControl component
<AccessControl attributes={(user) => user.age >= 18}>
    <AdultOnlyContent />
</AccessControl>

// Complex business logic
<AccessControl
    roles={["employee"]}
    attributes={(user) => user.department === "engineering" && user.yearsOfExperience >= 5}
>
    <SeniorEngineerDashboard />
</AccessControl>

// With useHasAccess hook
const canAccessPremium = useHasAccess({
    attributes: (user) => {
        const now = new Date();
        const expiry = new Date(user.subscriptionExpiry);
        return expiry > now && user.tier === "premium";
    }
});

// Date-based access
const isWithinBusinessHours = useHasAccess({
    attributes: () => {
        const hour = new Date().getHours();
        return hour >= 9 && hour <= 17;
    }
});
```

### requireAccess and checkAccess (server-friendly)

Use these on the server (or anywhere outside React) to validate access. checkAccess returns a boolean; requireAccess
throws when unauthorized.

```typescript
import {
    checkAccess,
    requireAccess,
    generateUserAccessControlConfig,
    type AuthUser,
    type UserAccessControl,
} from "r3-utils/access-control";

interface AppUser extends AuthUser {
    department?: string
}

// Example: Express/Remix/Next action handler
function handleCreateUser(currentUser: AppUser) {
    requireAccess<AppUser>(currentUser, {
        permissions: ["create:users"],
        attributes: { department: "people" },
    });
    // proceed…
}

// If you only need a boolean
const canRead = checkAccess<AppUser>(currentUser, { permissions: ["read:users"] });
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
    generateMenuAccess,
    useAccessControl,
    type MenuConfig,
    type AuthUser,
} from "r3-utils/access-control";

type SettingsMenu = "dashboard" | "zones" | "branches";

interface AppUser extends AuthUser {
    department?: string
}

const useManageSettingsMenus = () => {
    const menuConfig: MenuConfig<SettingsMenu, AppUser> = {
        dashboard: [
            { accessControl: { roles: ["admin"] }, link: "/settings/admin" },
            { accessControl: { roles: ["hr"] }, link: "/settings/hr" },
        ],
        zones: [{ accessControl: {}, link: "/settings/zones" }],
        branches: [{ accessControl: {}, link: "/settings/branches" }],
    };

    const access = useAccessControl<AppUser>();
    const accessMap = generateMenuAccess<SettingsMenu, AppUser>(access, menuConfig);
    return accessMap;
};
```

#### Usage

```typescript
import { MenuConfig } from "r3-utils/access-control";

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
            url: settingsAccess.dashboard.link!,
        }),
        // Other menus
    ];
};

// settings/layout.tsx
const SettingLayout = () => {
    const settingsMenus = useManageSettingsMenus();
    return (
        <>
            {/* Other layouts */ }
        < div >
        {
            settingsMenus.map((menu) => (
                <SettingMenu key = { menu.name } menu = { menu }
    />
))
}
    </div>
    < />
)
    ;
};
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
