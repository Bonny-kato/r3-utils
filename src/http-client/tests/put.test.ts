import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";

const BASE_URL = "https://example.com";

const USER_RESPONSE = {
    id: 1,
    name: "John Doe",
};

const USER_PAYLOAD = {
    name: "John Doe",
};

describe("HttpClient", () => {
    describe("HTTP Methods", () => {
        describe("PUT", () => {
            let httpClient: HttpClient;
            let mockAxios: AxiosMockAdapter;

            beforeEach(() => {
                httpClient = new HttpClient({
                    baseUrl: BASE_URL,
                });
                mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
                mockAxios.resetHistory();
            });

            it("should make successful PUT request", async () => {
                mockAxios
                    .onPut(`${BASE_URL}/users/1`)
                    .reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.put(
                    "/users/1",
                    USER_PAYLOAD
                );

                const request = mockAxios.history.put[0];

                expect.soft(error).toBe(null);
                expect.soft(request.method?.toUpperCase()).toBe("PUT");
                expect.soft(request.url).toBe(`/users/1`);

                expect(results).toMatchObject(USER_RESPONSE);
            });

            it("should make PUT request with custom headers", async () => {
                const API_KEY = "my-api-key";

                mockAxios.onPut(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.put(
                    "/users",
                    USER_PAYLOAD,
                    {
                        headers: {
                            "X-API-KEY": API_KEY,
                        },
                    }
                );

                const request = mockAxios.history.put[0];

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);
                expect.soft(request.method?.toUpperCase()).toBe("PUT");

                expect(request.headers).toMatchObject({
                    "X-API-KEY": API_KEY,
                });
            });

            it("should make PUT request with token authorization", async () => {
                const TOKEN = "my-token";

                mockAxios.onPut(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.put(
                    "/users",
                    USER_PAYLOAD,
                    {
                        headers: {
                            Authorization: `Bearer ${TOKEN}`,
                        },
                    }
                );

                const request = mockAxios.history.put[0];

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);
                expect.soft(request.method?.toUpperCase()).toBe("PUT");

                expect(request.headers).toMatchObject({
                    Authorization: `Bearer ${TOKEN}`,
                });
            });

            it("should handle PUT request errors", async () => {
                mockAxios.onPut(`${BASE_URL}/users`).reply(500, {
                    message: "Internal Server Error",
                });

                const [error, result] = await httpClient.put(
                    "/users",
                    USER_PAYLOAD
                );

                const request = mockAxios.history.put[0];

                expect.soft(error).not.toBe(null);
                expect.soft(error?.status).toBe(500);

                expect.soft(error?.message).toBeDefined();
                expect.soft(typeof error?.message).toBe("string");

                expect.soft(request.method?.toUpperCase()).toBe("PUT");
                expect(result).toBe(null);
            });
        });
    });
});
