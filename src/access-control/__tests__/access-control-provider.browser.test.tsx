import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
    AccessControlProvider,
    useAccessControl,
} from "~/access-control/access-control-provider";
import type { TestAcUser } from "~/access-control/access-control-test-utils";
import type { AccessControlConfig } from "~/access-control/type";
import { tryCatch } from "~/utils";

const makeConfig = (
    overrides?: Partial<AccessControlConfig<TestAcUser>>
): AccessControlConfig<TestAcUser> => ({
    userAttributes: { age: 18, location: "mwanza" },
    userPermissions: ["read:users", "edit:document"],
    userRoles: ["admin", "editor"],
    ...overrides,
});

const ShowConfig = () => {
    const { userRoles, userPermissions, userAttributes } =
        useAccessControl<TestAcUser>();
    return (
        <div>
            <span data-testid="roles">{userRoles.join(",")}</span>
            <span data-testid="perms">{userPermissions.join(",")}</span>
            <span data-testid="age">{String(userAttributes.age)}</span>
        </div>
    );
};

describe("access-control-provider and useAccessControl (browser)", () => {
    it("AccessControlProvider supplies context to children and useAccessControl returns config", async () => {
        const cfg = makeConfig();
        const screen = await render(
            <AccessControlProvider accessControlConfig={cfg}>
                <ShowConfig />
            </AccessControlProvider>
        );

        await expect
            .element(screen.getByTestId("roles"))
            .toHaveTextContent("admin,editor");
        await expect
            .element(screen.getByTestId("perms"))
            .toHaveTextContent("read:users,edit:document");
        await expect.element(screen.getByTestId("age")).toHaveTextContent("18");
    });

    it("useAccessControl throws when used outside AccessControlProvider", async () => {
        const [renderError, screen] = await tryCatch(render(<ShowConfig />));

        expect(screen).toBe(null);
        expect(renderError?.message).toContain(
            "useAccessControl should be used inside AccessControlProvider"
        );
    });

    it("useAccessControl reflects updated config when provider props change (render new)", async () => {
        const first = await render(
            <AccessControlProvider
                accessControlConfig={makeConfig({
                    userAttributes: { age: 18, location: "mwanza" },
                })}
            >
                <ShowConfig />
            </AccessControlProvider>
        );
        await expect.element(first.getByTestId("age")).toHaveTextContent("18");

        await first.rerender(
            <AccessControlProvider
                accessControlConfig={makeConfig({
                    userAttributes: { age: 25, location: "mwanza" },
                })}
            >
                <ShowConfig />
            </AccessControlProvider>
        );
        const ages = document.querySelectorAll('[data-testid="age"]');
        const last = ages[ages.length - 1] as HTMLElement;
        await expect.element(last).toHaveTextContent("25");
    });
});
