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
        describe("POST", () => {
            let httpClient: HttpClient;
            let mockAxios: AxiosMockAdapter;

            beforeEach(() => {
                httpClient = new HttpClient({
                    baseUrl: BASE_URL,
                });
                mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
                mockAxios.resetHistory();
            });

            it("should make successful POST request", async () => {
                mockAxios.onPost(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.post(
                    "/users",
                    USER_PAYLOAD
                );

                const request = mockAxios.history.post[0];

                expect.soft(error).toBe(null);
                expect.soft(request.method?.toUpperCase()).toBe("POST");
                expect.soft(request.url).toBe(`/users`);

                expect(results).toMatchObject(USER_RESPONSE);
            });

            it("should make POST request with custom headers", async () => {
                const API_KEY = "my-api-key";

                mockAxios.onPost(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.post(
                    "/users",
                    USER_PAYLOAD,
                    {
                        headers: {
                            "X-API-KEY": API_KEY,
                        },
                    }
                );

                const request = mockAxios.history.post[0];

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);
                expect.soft(request.method?.toUpperCase()).toBe("POST");

                expect(request.headers).toMatchObject({
                    "X-API-KEY": API_KEY,
                });
            });

            it("should make POST request with token authorization", async () => {
                const TOKEN = "my-token";

                mockAxios.onPost(`${BASE_URL}/users`).reply(200, USER_RESPONSE);
                const [error, results] = await httpClient.post(
                    "/users",
                    USER_PAYLOAD,
                    {
                        headers: {
                            Authorization: `Bearer ${TOKEN}`,
                        },
                    }
                );

                const request = mockAxios.history.post[0];

                expect.soft(error).toBe(null);
                expect.soft(results).toMatchObject(USER_RESPONSE);
                expect.soft(request.method?.toUpperCase()).toBe("POST");

                expect(request.headers).toMatchObject({
                    Authorization: `Bearer ${TOKEN}`,
                });
            });

            it("should handle POST request errors", async () => {
                mockAxios.onPost(`${BASE_URL}/users`).reply(500, {
                    message: "Internal Server Error",
                });

                const [error, result] = await httpClient.post(
                    "/users",
                    USER_PAYLOAD
                );

                const request = mockAxios.history.post[0];

                expect.soft(error).not.toBe(null);
                expect.soft(error?.status).toBe(500);

                expect.soft(error?.message).toBeDefined();
                expect.soft(typeof error?.message).toBe("string");

                expect.soft(request.method?.toUpperCase()).toBe("POST");
                expect(result).toBe(null);
            });
        });
    });
});
