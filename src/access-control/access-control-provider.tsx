import { createContext, JSX, ReactNode, useContext } from "react";
import { AccessControlConfig, AuthUser } from "./type";

type AccessControlContextType<T extends AuthUser = AuthUser> =
    AccessControlConfig<T> | null;

const AccessControlContext = createContext<AccessControlContextType>(null);

/**
 * React context provider that supplies access control configuration to child components.
 * This provider must wrap any components that use access control functionality.
 *
 * @template T - Type that extends AuthUser
 * @param props - The provider props
 * @param props.accessControlConfig - The access control configuration containing user roles, permissions, and attributes
 * @param props.children - Child components that will have access to the access control context
 * @returns JSX element that provides access control context to its children
 *
 * @example
 * ```tsx
 * const userAccessConfig = generateUserAccessControlConfig(currentUser);
 *
 * function App() {
 *   return (
 *     <AccessControlProvider accessControlConfig={userAccessConfig}>
 *       <Dashboard />
 *       <UserProfile />
 *     </AccessControlProvider>
 *   );
 * }
 * ```
 */
export const AccessControlProvider = <T extends AuthUser>({
    accessControlConfig,
    children,
}: {
    accessControlConfig: AccessControlConfig<T>;
    children: ReactNode;
}): JSX.Element => {
    return (
        <AccessControlContext.Provider value={accessControlConfig}>
            {children}
        </AccessControlContext.Provider>
    );
};

/**
 * React hook that provides access to the current user's access control configuration.
 * Must be used within an AccessControlProvider context.
 *
 * @template T - Type that extends AuthUser
 * @returns The access control configuration containing user roles, permissions, and attributes
 * @throws Error if used outside of AccessControlProvider context
 *
 * @example
 * ```tsx
 * function UserDashboard() {
 *   const { userRoles, userPermissions, userAttributes } = useAccessControl<AppUser>();
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {userAttributes.name}</h1>
 *       <p>Your roles: {userRoles.join(', ')}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export const useAccessControl = <
    T extends AuthUser,
>(): AccessControlConfig<T> => {
    const context = useContext(
        AccessControlContext
    ) as AccessControlContextType<T>;
    if (!context)
        throw new Error(
            "useAccessControl should be used inside AccessControlProvider"
        );
    return context;
};
