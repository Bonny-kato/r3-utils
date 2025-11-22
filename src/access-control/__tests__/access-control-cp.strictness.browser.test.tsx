import { describe, expect, it } from "vitest";
import {
    renderWithAccessControlProvider,
    TestAcUser,
} from "~/access-control/access-control-test-utils";
import { createAccessControl } from "~/access-control/create-access-control";

describe("AccessControl Component - strictness options (browser)", () => {
    const { AccessControl } = createAccessControl<TestAcUser>();

    it("respects strictness options for permissions", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl
                permissions={["edit:document", "create:document"]}
                strictness={{ permissions: true }}
            >
                <span>ok</span>
            </AccessControl>
        );

        await expect.element(screen.getByText("ok")).toBeInTheDocument();
    });

    it("respects strictness options for attributes", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl
                attributes={{ age: 18, location: "mwanza" }}
                strictness={{ attributes: true }}
                fallback={<span>guest</span>}
            >
                <span>private</span>
            </AccessControl>
        );
        await expect.element(screen.getByText("private")).toBeInTheDocument();
    });

    it("renders fallback when strict attribute check fails", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl
                attributes={{ age: 18, location: "dodoma" }}
                strictness={{ attributes: true }}
                fallback={<span>guest</span>}
            >
                <span>private</span>
            </AccessControl>
        );
        await expect.element(screen.getByText("guest")).toBeInTheDocument();
    });
});
