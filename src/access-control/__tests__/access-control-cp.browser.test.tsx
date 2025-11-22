import { describe, expect, it } from "vitest";

import { renderWithAccessControlProvider, TestAcUser, } from "~/access-control/access-control-test-utils";
import { createAccessControl } from "~/access-control/create-access-control";

describe("AccessControl Component", () => {
    const { AccessControl } = createAccessControl<TestAcUser>();

    it("should render children if user has required access", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl
                attributes={{ age: 18 }}
                permissions={["read:users"]}
            >
                <button>click me!</button>
            </AccessControl>
        );

        const deleteButton = screen.getByRole("button");

        await expect.element(deleteButton).toBeDefined();
        await expect.element(deleteButton).toHaveTextContent("click me!");
    });

    it("should not render children if user dose not have required access", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl
                attributes={{ age: 10 }}
                permissions={["read:project"]}
            >
                <button>click me!</button>
            </AccessControl>
        );

        const deleteButton = screen.getByRole("button");
        await expect.element(deleteButton).not.toBeInTheDocument();
    });

    it("should render when access control does not provided", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl>
                <button>click me!</button>
            </AccessControl>
        );
        const deleteButton = screen.getByRole("button");
        await expect.element(deleteButton).toBeInTheDocument();
    });

    it("should render the fallback component when user does not have required access", async () => {
        const screen = await renderWithAccessControlProvider(
            <AccessControl
                attributes={{ age: 10 }}
                permissions={["read:project"]}
                fallback={<span> guest contents </span>}
            >
                <span>private contents</span>
            </AccessControl>
        );

        const privateContents = screen.getByText("private contents");
        const guestContents = screen.getByText("guest contents");

        await expect.element(privateContents).not.toBeInTheDocument();
        await expect.element(guestContents).toBeInTheDocument();
    });
});
