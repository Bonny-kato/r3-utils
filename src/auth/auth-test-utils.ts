import RedisMock from "ioredis-mock";
import { createCookie, data } from "react-router";
import { Auth, RedisStorageAdapter } from "~/auth/index";
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
        storageAdapter: mockRedisAdapter,
        ...overrides,
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
            headers: cookie ? { Cookie: cookie } : undefined,
            method,
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

export const authUserTestData = {
    branch: "[REDACTED]",
    branchCode: "[REDACTED]",
    id: "7b7aba952b294fefe4f216816bcd5b0217e94b78",
    masterToken: "eyJhbGciOiJSUzUxMiJ9....",
    name: "admin@bancassurance.com",
    refreshToken: "ec8d0fe6-5be1-47f...",
    roles: [{ name: "BANCA", permissions: ["banca001", "banca002"] }],
    token: "eyJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDk5MTA2OTAsImV4cCI6MjM1NDcxMDY5MCwic3ViIjoiMTUyIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwIiwianRpIjoiMTUyLTE3NDk5MTA2OTAyMjAiLCJ1c2VybmFtZSI6ImFkbWluQGJhbmNhc3N1cmFuY2UuY29tIiwic3lzdGVtcyI6WyJCQU5DQVNTVVJBTkNFIl0sInVzZXIiOnsiY2JzVXNlcklkIjoiMTUyIiwiY2xpZW50SWQiOiJhZG1pbkBiYW5jYXNzdXJhbmNlLmNvbSIsInVzZXJHcm91cHMiOlsxNTJdLCJuYW1lIjoiQmFuY2Fzc3VyYW5jZSBBZG1pbiIsImNsaWVudE5hbWUiOiJCYW5jYXNzdXJhbmNlIEFkbWluIiwiYnVzaW5lc3NVbml0Q29kZSI6IltSRURBQ1RFRF0iLCJidXNpbmVzc1VuaXROYW1lIjoiW1JFREFDVEVEXSIsInVzZXJuYW1lIjoiYWRtaW5AYmFuY2Fzc3VyYW5jZS5jb20iLCJmaXJzdE5hbWUiOiJCYW5jYXNzdXJhbmNlIiwibGFzdE5hbWUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AYmFuY2Fzc3VyYW5jZS5jb20iLCJwaG9uZU51bWJlciI6IjA2ODk0Nzc0MzIifSwicGVybWlzc2lvbnMiOlsiYmFuY2EwMDEiLCJiYW5jYTAwMiJdfQ.owuvnz9E3cRXTEKAiS8QhhUiT0mwvUGvwJ0LBaPRMrkJ2V7plcIAi_btWyBNRbaIuwjXOSZQelYYnjbgj5rmy4RjeUoz1sNg-i9UuOtkBZv8Uch7KLohprK9oAaAuzZWwYw_4LozSPqwfUMEIaq7R7r93aena8RMVEHLbNLU7bjAyczmIKzTX-wKM2vfjRUxU1u5bMpHqIxE6dMEREYD2neJ5-J0Zmxrg2Jzmf3CJcRQdYwlIpzBDRCgj5PtsUKOK-R9bfpyhWWrfcJYRRQfOHgNsMDpXxfA_yNwI0mA8xOhwf-bb_JecvtLEjeMzdwHvVQ-7tVjwbEC8zUfRvqS0g",
};
