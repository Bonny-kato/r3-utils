import { dataWithError } from "remix-toast";
import { describe, expect, it, vi } from "vitest";
import { actionError } from "~/utils";

vi.mock("remix-toast", () => ({
    dataWithError: vi.fn((data, message, options) => ({
        data,
        message,
        options,
    })),
}));

describe("actionError", () => {
    it("preserves error payload without forwarding the response status", () => {
        const payload = { email: "invalid-email" };
        const error = { message: "Invalid email", status: 422 };

        const response = actionError(payload, error);

        expect(dataWithError).toHaveBeenCalledWith(
            [error, payload],
            error.message
        );
        expect(response).toEqual({
            data: [error, payload],
            message: error.message,
            options: undefined,
        });
    });
});
