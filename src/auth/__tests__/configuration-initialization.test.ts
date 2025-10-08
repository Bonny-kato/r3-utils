import { data } from "react-router";
import { describe, expect, it } from "vitest";
import { Auth } from "~/auth";
import { mockRedisAdapter, TestUser } from "~/auth/__tests__/auth-test-utils";
import { HTTP_INTERNAL_SERVER_ERROR } from "~/http-client";
import { tryCatch } from "~/utils/try-catch";

type DataWithResponseInit<TData = unknown> = ReturnType<typeof data<TData>>;

describe("Auth: Configuration & Initialization", () => {
    it("should throw when cookie.name is missing", () => {
        const [error, auth] = tryCatch<Auth<TestUser>, DataWithResponseInit>(
            () => {
                return new Auth({
                    // @ts-expect-error intentionally omitting cookie.name to test error handling
                    cookie: {
                        secrets: ["your_session_secret_here"],
                    },
                    sessionStorageType: "in-custom-db",
                    storageAdapter: mockRedisAdapter,
                });
            }
        );

        expect(auth).toBe(null);
        expect(error).not.toBe(null);

        expect(error?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(error?.data).toBe("Cookie name is required");
    });

    it("should throw when cookie.secrets is missing", () => {
        const [error, auth] = tryCatch<Auth<TestUser>, DataWithResponseInit>(
            () => {
                return new Auth({
                    // @ts-expect-error intentionally omitting cookie.secrets to test error handling
                    cookie: {
                        name: "__test_session",
                    },
                    sessionStorageType: "in-custom-db",
                    storageAdapter: mockRedisAdapter,
                });
            }
        );

        expect(auth).toBe(null);
        expect(error).not.toBe(null);

        expect(error?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(error?.data).toBe("Cookie secrets are required");
    });

    it("should throw when sessionStorageType is 'in-custom-db' and 'storageAdapter' does not provided", () => {
        const [error, auth] = tryCatch<Auth<TestUser>, DataWithResponseInit>(
            () => {
                // @ts-expect-error intentionally omitting storageAdapter to test error handling
                return new Auth({
                    cookie: {
                        name: "__test_session",
                        secrets: ["checked"],
                    },
                    sessionStorageType: "in-custom-db",
                }) as unknown as Auth<TestUser>;
            }
        );

        expect(auth).toBe(null);
        expect(error).not.toBe(null);

        expect(error?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(error?.data).toBe(
            "Storage adapter is required when using in-custom-db mode"
        );
    });

    it("should throw when sessionStorageType is not supported and 'storageAdapter' does not provided", () => {
        const [error, auth] = tryCatch<Auth<TestUser>, DataWithResponseInit>(
            () => {
                return new Auth({
                    cookie: {
                        name: "__test_session",
                        secrets: ["checked"],
                    },
                    // @ts-expect-error intentionally providing unsupported sessionStorageType
                    sessionStorageType: "unsupported",
                }) as unknown as Auth<TestUser>;
            }
        );

        expect(auth).toBe(null);
        expect(error).not.toBe(null);

        expect(error?.init?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
        expect(error?.data).toBe(
            "Invalid storage type. Must be one of: 'in-memory', 'in-cookie-only', 'in-custom-db.'"
        );
    });

    it("should initialize auth module successfully when all require options are passed correctly", () => {
        const [error, auth] = tryCatch<Auth<TestUser>, DataWithResponseInit>(
            () => {
                return new Auth({
                    cookie: {
                        name: "__test_session",
                        secrets: ["checked"],
                    },
                    sessionStorageType: "in-memory",
                }) as unknown as Auth<TestUser>;
            }
        );

        expect(error).toBe(null);
        expect(auth).toBeInstanceOf(Auth);
    });
});
