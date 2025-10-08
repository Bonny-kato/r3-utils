import RedisMock from "ioredis-mock";
import { createCookie, data } from "react-router";
import { Auth, RedisStorageAdapter } from "~/auth";
import type { AuthOptions } from "~/auth/types";

/**
 * Test user interface for authentication testing
 */
export interface TestUser {
    id: string;
    name?: string;
    token?: string;
}

export type DataWithResponseInit<TData = unknown> = ReturnType<
    typeof data<TData>
>;

export const COLLECTION_NAME = "auth_users";

const redisClient = new RedisMock();

/**
 * Redis storage adapter instance for test authentication
 */
export const mockRedisAdapter = new RedisStorageAdapter<TestUser>(
    COLLECTION_NAME,
    {
        redisClient,
    }
);

export const $cookie = createCookie("__test_session", {
    secrets: ["your_session_secret_here"],
});

/**
 * Creates an Auth instance for testing purposes
 * @param overrides - Optional partial auth options to override defaults
 * @returns A new Auth instance configured for testing
 */
export const createMockAuth = (overrides?: Partial<AuthOptions<TestUser>>) =>
    new Auth<TestUser>({
        cookie: {
            name: "__test_session",
            secrets: ["your_session_secret_here"],
        },
        sessionStorageType: "in-custom-db",
        ...overrides,
        storageAdapter: mockRedisAdapter,
    });

/**
 * Extracts the cookie name-value pair from a Set-Cookie header in the request
 * @param response - The Response object containing headers
 * @returns The cookie name-value pair from Set-Cookie header or empty string if header not found
 */
export const getSessionCookie = (response: Response) => {
    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) return "";
    return setCookie.split(";")[0];
};

/**
 * Creates a mock Request object for testing
 * @param url - The request URL
 * @param cookie - Optional cookie header value
 * @param method - The request metho
 * @returns A new Request object
 */
export const mockRequest = (
    url: string,
    cookie?: string,
    method: string = "GET"
) => {
    return new Request(
        `http://localhost${url}`.replace(/\s+/g, (m) => encodeURIComponent(m)),
        {
            method,
            headers: cookie ? { Cookie: cookie } : undefined,
        }
    );
};

/**
 * Gets the Location header from a Response object
 * @param res - The Response object
 * @returns The Location header value or null if not present
 */
export const getLocation = (res: Response | null = new Response()) =>
    res?.headers.get("Location");
