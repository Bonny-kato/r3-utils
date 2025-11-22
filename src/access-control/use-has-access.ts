import { checkIfAuthorized } from "./access-control-helpers";
import { useAccessControl } from "./access-control-provider";
import { AuthUser, UserAccessControl } from "./type";

/**
 * Custom hook to determine if the user has the specified roles, permissions, or attributes.
 * Uses the access control configuration from the AccessControlProvider context.
 *
 * @template T - Type that extends AuthUser
 * @param {UserAccessControl<T>} accessControl - The access control requirements.
 * Supports both legacy array/object formats and the new `AccessRequirement`
 * configuration objects for roles, permissions, and attributes.
 * @returns {boolean} - Returns true if the user has the required access, false otherwise.
 */
export const useHasAccess = <T extends AuthUser>({
    roles,
    permissions,
    attributes,
}: UserAccessControl<T>): boolean => {
    const accessConfig = useAccessControl<T>();

    return checkIfAuthorized<T>(accessConfig, {
        attributes,
        permissions,
        roles,
    });
};
