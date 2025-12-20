import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";

describe("HttpClient", () => {
    let httpClient: HttpClient;
    let mockAxios: AxiosMockAdapter;

    const BASE_URL = "https://example.com";

    beforeEach(() => {
        httpClient = new HttpClient({
            baseUrl: BASE_URL,
            headers: {
                "X-Client": "Webstorm",
            },
        });
        mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
        mockAxios.resetHistory();
    });

    describe("Configuration Merging", () => {
        it("should use global baseUrl when no per-request baseUrl provided", async () => {
            mockAxios.onGet(`${BASE_URL}/users`).reply(200);

            await httpClient.get("/users");
            expect(mockAxios.history.get[0].baseURL).toBe(BASE_URL);
        });

        it("should override global baseUrl with per-request baseUrl", async () => {
            const PER_REQUEST_BASE_URL = "https://example.com/api";

            mockAxios.onGet(`${PER_REQUEST_BASE_URL}/users`).reply(200);

            await httpClient.get("/users", {
                baseUrl: PER_REQUEST_BASE_URL,
            });

            expect(mockAxios.history.get[0].baseURL).toBe(PER_REQUEST_BASE_URL);
        });

        it("should merge global headers with per-request headers", async () => {
            mockAxios.onGet(`${BASE_URL}/users`).reply(200);
            await httpClient.get("/users", {
                headers: {
                    "X-Key": "my-key",
                },
            });

            expect(mockAxios.history.get[0].headers).toMatchObject({
                "X-Client": "Webstorm",
                "X-Key": "my-key",
            });
        });

        it("should add Authorization header when token is provided", async () => {
            const TOKEN = "my-token";
            mockAxios.onGet(`${BASE_URL}/users`).reply(200);
            await httpClient.get("/users", {
                headers: {
                    Authorization: `Bearer ${TOKEN}`,
                },
            });

            expect(mockAxios.history.get[0].headers).toMatchObject({
                Authorization: `Bearer ${TOKEN}`,
            });
        });
        it("should handle absolute URLs correctly (ignore baseUrl)", async () => {
            const ABSOLUTE_URL = "https://example.com/api/users";

            mockAxios.onGet(ABSOLUTE_URL).reply(200);
            await httpClient.get(ABSOLUTE_URL);

            const request = mockAxios.history.get[0];

            expect.soft(request.url).toBe(ABSOLUTE_URL);
            expect(request.baseURL).toBe(BASE_URL);
        });

        it("should handle relative endpoints with baseUrl", async () => {
            const RELATIVE_ENDPOINT = "/api/users";
            mockAxios.onGet(`${BASE_URL}${RELATIVE_ENDPOINT}`).reply(200);

            await httpClient.get(RELATIVE_ENDPOINT);
            const request = mockAxios.history.get[0];

            expect(`${request.baseURL}${request.url}`).toBe(
                `${BASE_URL}${RELATIVE_ENDPOINT}`
            );
        });
    });
});
