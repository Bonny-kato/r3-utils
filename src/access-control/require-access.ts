import { throwCustomError } from "~/utils";
import { checkIfAuthorized } from "./access-control-helpers";
import { generateUserAccessControlConfig } from "./generate-user-access-control-config";
import {
    AccessControlStrictnessOptions,
    AuthUser,
    RequireAccessOptions,
    UserAccessControl,
} from "./type";

/**
 * Checks if a user has the required access based on their roles, permissions, and attributes.
 * This is a convenience function that combines user access control config generation with authorization checking.
 *
 * @template TUser - Type that extends AuthUser
 * @param user - The user object to check access for
 * @param requiredAccess - The access requirements (roles, permissions, attributes) that need to be satisfied
 * @param strictnessOptions - Options to control strictness for each access type (default: {}).
 * property (roles, permissions, or attributes) instead.
 * @returns True if the user has the required access, false otherwise
 *
 * @example
 * ```typescript
 * const user: AppUser = {
 *   id: '123',
 *   roles: [{ name: 'EDITOR', permissions: ['read:posts', 'write:posts'] }],
 *   department: 'content'
 * };
 *
 * const requiredAccess: UserAccessControl<AppUser> = {
 *   roles: ['editor'],
 *   permissions: ['write:posts']
 * };
 *
 * // Check with default (non-strict) options
 * const hasAccess = checkAccess(user, requiredAccess); // true
 *
 * // Check with strict role checking
 * const hasStrictAccess = checkAccess(user, requiredAccess, { roles: true }); // true
 * ```
 */
export const checkAccess = <TUser extends AuthUser>(
    user: TUser,
    requiredAccess: UserAccessControl<TUser>,
    strictnessOptions: AccessControlStrictnessOptions = {} as AccessControlStrictnessOptions
): boolean => {
    const accessControlConfig = generateUserAccessControlConfig<TUser>(user);

    return checkIfAuthorized<TUser>(
        accessControlConfig,
        requiredAccess,
        strictnessOptions
    );
};

// ----------------------------------------------------------------------

/**
 * Enforces access control by checking if a user has the required access and throwing an error if not.
 * This function is useful for protecting API endpoints or sensitive operations where access must be guaranteed.
 *
 * @template T - Type that extends AuthUser
 * @param user - The user object to check access for
 * @param accessControl - The access requirements (roles, permissions, attributes) that must be satisfied
 * @param options - Configuration options for access control behavior
 * @param options.strictness - Strictness configuration for different access control types.
 * @param options.unauthorizedErrorMessage - Custom error message when access is denied
 * @returns The original user object if access is granted
 * @throws Error with 403 status if access is denied
 *
 * @example
 * ```typescript
 * // Basic usage - protect an admin-only operation
 * function deleteUser(currentUser: AppUser, targetUserId: string) {
 *   requireAccess(currentUser, { roles: ['admin'] });
 *   // This code only runs if user has admin role
 *   return userService.delete(targetUserId);
 * }
 *
 * // With custom error message and strict checking
 * function accessFinancialReports(currentUser: AppUser) {
 *   requireAccess(
 *     currentUser,
 *     {
 *       roles: ['finance-manager', 'cfo'],
 *       attributes: { isActive: true, department: 'finance' }
 *     },
 *     {
 *       strictness: { attributes: true },
 *       unauthorizedErrorMessage: 'Access to financial reports requires finance department membership'
 *     }
 *   );
 *   return financialService.getReports();
 * }
 *
 * // Usage in API endpoint
 * app.post('/api/admin/users', (req, res) => {
 *   try {
 *     requireAccess(req.user, { permissions: ['create:users'] });
 *     // Protected operation continues here
 *   } catch (error) {
 *     // Error is automatically thrown with HTTP_FORBIDDEN status
 *   }
 * });
 * ```
 */
export const requireAccess = <T extends AuthUser>(
    user: T,
    accessControl: UserAccessControl<T>,
    options = {} as RequireAccessOptions
): T => {
    const {
        strictness,
        unauthorizedErrorMessage = "You're not authorized to access this resources",
    } = options;

    const hasAccess = checkAccess<T>(user, accessControl, strictness);

    if (!hasAccess) {
        throwCustomError(unauthorizedErrorMessage, 403);
    }

    return user;
};
