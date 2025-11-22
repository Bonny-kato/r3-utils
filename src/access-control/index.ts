import AccessControl from "./access-control";
import { hasAttribute, hasPermission, hasRole } from "./access-control-helpers";
import {
    AccessControlProvider,
    useAccessControl,
} from "./access-control-provider";
import {
    generateMenuAccess,
    MenuConfig,
    MenuItemAccess,
    MenuItemConfig,
} from "./generate-menu-access-control";
import { generateUserAccessControlConfig } from "./generate-user-access-control-config";
import { checkAccess, requireAccess } from "./require-access";
import {
    AccessControlConfig,
    AccessControlStrictnessOptions,
    AccessRequirement,
    AttributeRequirement,
    PlainUserAttribute,
    AuthUser,
    GenerateAccessControlConfigFunc,
    UserAccessControl,
} from "./type";
import { useHasAccess } from "./use-has-access";

export {
    AccessControl,
    AccessControlProvider,
    checkAccess,
    generateMenuAccess,
    generateUserAccessControlConfig,
    hasAttribute,
    hasPermission,
    hasRole,
    requireAccess,
    useAccessControl,
    useHasAccess,
};

export type {
    AccessControlConfig,
    AccessControlStrictnessOptions,
    AccessRequirement,
    AttributeRequirement,
    PlainUserAttribute,
    AuthUser,
    GenerateAccessControlConfigFunc,
    MenuConfig,
    MenuItemAccess,
    MenuItemConfig,
    UserAccessControl,
};
