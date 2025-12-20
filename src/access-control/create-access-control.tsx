import { FC, ReactNode } from "react";
import AccessControl, {
    AccessControlProps,
} from "~/access-control/access-control";
import {
    hasAttribute,
    hasPermission,
    hasRole,
} from "~/access-control/access-control-helpers";
import {
    AccessControlProvider,
    useAccessControl,
} from "~/access-control/access-control-provider";
import {
    generateMenuAccess,
    MenuConfig,
} from "~/access-control/generate-menu-access-control";
import { generateUserAccessControlConfig } from "~/access-control/generate-user-access-control-config";
import { checkAccess, requireAccess } from "~/access-control/require-access";
import {
    AccessControlConfig,
    AuthUser,
    RequireAccessOptions,
    UserAccessControl,
    UserAttribute,
} from "~/access-control/type";
import { useHasAccess } from "~/access-control/use-has-access";

export const createAccessControl = <TUser extends AuthUser>() => {
    const TypedAccessControl: FC<AccessControlProps<TUser>> = (props) => (
        <AccessControl<TUser> {...props} />
    );

    const useTypedHasAccess = (props: UserAccessControl<TUser>) =>
        useHasAccess(props);

    const useTypedAccessControl = () => useAccessControl<TUser>();

    const typedRequireAccess = (
        user: TUser,
        accessControl: UserAccessControl<TUser>,
        options = {} as RequireAccessOptions
    ) => requireAccess(user, accessControl, options);

    const typedHasAttributes = (
        userAttributes: UserAttribute<TUser>,
        requiredAttributes: UserAttribute<TUser>,
        strict: boolean | { requireAll?: boolean; not?: boolean } = false
    ) => hasAttribute(userAttributes, requiredAttributes, strict);

    const typedGenerateUserAccessControlConfig = (user: TUser) =>
        generateUserAccessControlConfig(user);

    const typedCheckAccess = (
        user: TUser,
        requiredAccess: UserAccessControl<TUser>,
        strictnessOptions = {}
    ) => checkAccess(user, requiredAccess, strictnessOptions);

    const TypedAccessControlProvider = (props: {
        children: ReactNode;
        accessControlConfig: AccessControlConfig<TUser>;
    }) => <AccessControlProvider {...props} />;

    const typedGenerateMenuAccess = <TMenu extends string>(
        accessControlConfig: AccessControlConfig<TUser>,
        menuConfig: MenuConfig<TMenu, TUser>
    ) => generateMenuAccess(accessControlConfig, menuConfig);

    return {
        AccessControl: TypedAccessControl,
        AccessControlProvider: TypedAccessControlProvider,
        checkAccess: typedCheckAccess,
        generateMenuAccess: typedGenerateMenuAccess,
        generateUserAccessControlConfig: typedGenerateUserAccessControlConfig,
        hasAttribute: typedHasAttributes,
        hasPermission,
        hasRole,
        requireAccess: typedRequireAccess,
        useAccessControl: useTypedAccessControl,
        useHasAccess: useTypedHasAccess,
    };
};
