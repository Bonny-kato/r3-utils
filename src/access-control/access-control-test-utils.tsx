import { ReactNode } from "react";
import { AccessControlProvider } from "~/access-control/access-control-provider";
import { AccessControlConfig, AuthUser } from "~/access-control/type";
import { render } from "vitest-browser-react";

export interface TestAcUser extends AuthUser {
    age: number;
    location: string;
}

const accessControlConfig: AccessControlConfig<TestAcUser> = {
    userAttributes: {
        age: 18,
        location: "mwanza",
    },
    userPermissions: [
        "read:users",
        "read:roles",
        "edit:document",
        "create:document",
    ],
    userRoles: ["admin", "editor"],
};

export const renderWithAccessControlProvider = (
    children: ReactNode,
    config?: Partial<AccessControlConfig<TestAcUser>>
) => {
    const mergedAccessControlConfig = { ...accessControlConfig, ...config };
    return render(
        <AccessControlProvider accessControlConfig={mergedAccessControlConfig}>
            {children}
        </AccessControlProvider>
    );
};
