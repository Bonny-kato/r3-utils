import { createContext, JSX, ReactNode, useContext } from "react";
import { AccessControlConfig, AuthUser } from "./type";

/**
 * Type for the access control context
 * @template T - Type that extends AuthUser
 */
type AccessControlContextType<T extends AuthUser = AuthUser> =
    AccessControlConfig<T> | null;

/**
 * React context for access control configuration
 * Using Record<string, any> as a workaround for TypeScript's limitation with generic context
 */
const AccessControlContext = createContext<AccessControlContextType>(null);

/**
 * Provider component for access control
 * Makes the access control configuration available to all child components
 *
 * @template T - Type that extends AuthUser
 * @param {Object} props - Component props
 * @param {AccessControlConfig<T>} props.accessControlConfig - The access control configuration
 * @param {ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
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
 * Custom hook to access the AccessControlContext.
 *
 * @template T - Type that extends AuthUser
 * @throws Will throw an error if used outside an AccessControlProvider.
 * @returns {AccessControlConfig<T>} - The access control configuration.
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
