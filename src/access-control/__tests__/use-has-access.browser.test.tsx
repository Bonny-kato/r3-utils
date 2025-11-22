import { describe, expect, it } from "vitest";
import {
    renderWithAccessControlProvider,
    TestAcUser,
} from "~/access-control/access-control-test-utils";
import type { UserAccessControl } from "~/access-control/type";
import { useHasAccess } from "~/access-control/use-has-access";

const Probe = (props: UserAccessControl<TestAcUser>) => {
    const ok = useHasAccess<TestAcUser>(props);
    return <span data-testid="result">{ok ? "true" : "false"}</span>;
};

const renderProbe = (props: UserAccessControl<TestAcUser>) =>
    renderWithAccessControlProvider(<Probe {...props} />);

describe("useHasAccess hook (browser)", () => {
    it("returns true when role requirement is satisfied", async () => {
        const screen = await renderProbe({ roles: ["admin"] });
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("true");
    });

    it("returns true when permission requirement is satisfied", async () => {
        const screen = await renderProbe({ permissions: ["read:users"] });
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("true");
    });

    it("returns true when attribute requirement is satisfied", async () => {
        const screen = await renderProbe({ attributes: { age: 18 } });
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("true");
    });

    it("returns true when no requirements are provided", async () => {
        const screen = await renderProbe({});
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("true");
    });

    it("returns false when role requirement is not satisfied", async () => {
        const screen = await renderProbe({ roles: ["guest"] });
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("false");
    });

    it("returns false when permission requirement is not satisfied", async () => {
        const screen = await renderProbe({ permissions: ["delete:projects"] });
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("false");
    });

    it("returns false when attribute requirement is not satisfied", async () => {
        const screen = await renderProbe({ attributes: { age: 10 } });
        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("false");
    });

    it("returns true when mixed requirements are partially satisfied (non-strict behavior)", async () => {
        const screen = await renderProbe({
            attributes: { age: 99, location: "mwanza" },
            permissions: ["read:users", "none"],
            roles: ["admin", "ghost"],
        });

        await expect
            .element(screen.getByTestId("result"))
            .toHaveTextContent("true");
    });
});
