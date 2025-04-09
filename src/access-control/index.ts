// Import and re-export specific functions, types, and components for better tree shaking
import AccessControl from "./access-control";
import { hasAttribute, hasPermission, hasRole } from "./access-control-helpers";
import { AccessControlProvider, useAccessControl } from "./access-control-provider";
import {
    generateMenuAccess,
    MenuConfig,
    MenuItemAccess,
    MenuItemConfig,
} from "./generate-menu-access-control";
import {
    generateUserAccessControlConfig,
    GenerateUserAccessControlConfigFunc,
} from "./generate-user-access-control-config";
import { checkAccess, requireAccess, UnauthorizedError } from "./require-access";
import { AccessControlConfig, AuthUser, UserAccessControl } from "./type";
import { useHasAccess } from "./use-has-access";

export {
    AccessControl,
    hasRole,
    hasPermission,
    hasAttribute,
    AccessControlProvider,
    useAccessControl,
    useHasAccess,
    generateMenuAccess,
    generateUserAccessControlConfig,
    UnauthorizedError,
    checkAccess,
    requireAccess,
};
export type {
    MenuItemConfig,
    MenuItemAccess,
    MenuConfig,
    GenerateUserAccessControlConfigFunc,
    UserAccessControl,
    AccessControlConfig,
    AuthUser,
};
