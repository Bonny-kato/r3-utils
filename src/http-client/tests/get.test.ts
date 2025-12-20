import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";
import { serializeQueryParams } from "~/utils";

const BASE_URL = "https://example.com";

const USER_RESPONSE = {
    id: 1,
    name: "John Doe",
};

describe("HttpClient", () => {
    describe("HTTP Methods", () => {
        describe("GET", () => {
            let httpClient: HttpClient;
            let mockAxios: AxiosMockAdapter;

            beforeEach(() => {
                httpClient = new HttpClient({
                    baseUrl: BASE_URL,
                });
                mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
                mockAxios.resetHistory();
            });

            it("should make successful GET request", async () => {
                mockAxios.onGet(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.get("/users");

                const request = mockAxios.history.get[0];

                expect.soft(error).toBe(null);
                expect.soft(request.method?.toUpperCase()).toBe("GET");
                expect.soft(request.url).toBe(`/users`);

                expect(results).toMatchObject(USER_RESPONSE);
            });

            it("should make GET request with custom headers", async () => {
                const API_KEY = "my-api-key";

                mockAxios.onGet(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.get("/users", {
                    headers: {
                        "X-API-KEY": API_KEY,
                    },
                });

                const request = mockAxios.history.get[0];

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);
                expect.soft(request.method?.toUpperCase()).toBe("GET");

                expect(request.headers).toMatchObject({
                    "X-API-KEY": API_KEY,
                });
            });

            it("should make GET request with token authorization", async () => {
                const TOKEN = "my-token";

                mockAxios.onGet(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.get("/users", {
                    headers: {
                        Authorization: `Bearer ${TOKEN}`,
                    },
                });

                const request = mockAxios.history.get[0];

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);
                expect.soft(request.method?.toUpperCase()).toBe("GET");

                expect(request.headers).toMatchObject({
                    Authorization: `Bearer ${TOKEN}`,
                });
            });

            it("should make GET request with query parameters", async () => {
                const urlSearchParams = serializeQueryParams({
                    limit: 10,
                    page: 1,
                });

                mockAxios
                    .onGet(`${BASE_URL}/users?${urlSearchParams}`)
                    .reply(200, USER_RESPONSE);

                const [error, results] = await httpClient.get(
                    `/users?${urlSearchParams}`
                );

                const request = mockAxios.history.get[0];
                const fullURL = new URL(request.url!, request.baseURL);

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);

                expect.soft(request.method?.toUpperCase()).toBe("GET");
                expect.soft(fullURL.searchParams.get("page")).toBe("1");

                expect(fullURL.searchParams.get("limit")).toBe("10");
            });

            it("should handle GET request errors", async () => {
                mockAxios.onGet(`${BASE_URL}/users`).reply(500, {
                    message: "Internal Server Error",
                });

                const [error, result] = await httpClient.get("/users");

                const request = mockAxios.history.get[0];

                expect.soft(error).not.toBe(null);
                expect.soft(error?.status).toBe(500);

                expect.soft(error?.message).toBeDefined();
                expect.soft(typeof error?.message).toBe("string");

                expect.soft(request.method?.toUpperCase()).toBe("GET");
                expect(result).toBe(null);
            });
        });
    });
});
