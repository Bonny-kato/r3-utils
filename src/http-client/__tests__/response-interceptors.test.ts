import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";

const BASE_URL = "https://example.com/api";

describe("HttpClient", () => {
    describe("Response Interceptors", () => {
        let httpClient: HttpClient;
        let mockAxios: AxiosMockAdapter;

        beforeEach(() => {
            httpClient = new HttpClient({ baseUrl: BASE_URL });
            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();
        });

        it("should add response interceptor successfully", () => {
            const unsubscribe = httpClient.onResponse((response) => response);
            expect(typeof unsubscribe).toBe("function");
            // Cleanup
            unsubscribe();
        });

        it("should execute response interceptor after response", async () => {
            // Flip a flag in the response interceptor to assert it ran after the response
            let intercepted = false;
            httpClient.onResponse((response) => {
                intercepted = true;
                return response;
            });

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [err, data] = await httpClient.get("/users");

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect.soft(intercepted).toBe(true);

            // Ensure axios recorded a response, too
            expect(mockAxios.history.get[0].method?.toUpperCase()).toBe("GET");
        });

        it("should modify response data in interceptor", async () => {
            httpClient.onResponse((response) => {
                // Change the response.data
                response.data = { changed: true } as unknown as {
                    changed: boolean;
                };
                return response;
            });

            mockAxios.onGet(`${BASE_URL}/users/1`).reply(200, { ok: true });

            const [err, data] = await httpClient.get<{ changed: boolean }>(
                "/users/1"
            );

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ changed: true });
        });

        it("should handle response interceptor errors", async () => {
            httpClient.onResponse(() => {
                throw new Error("Boom in response interceptor");
            });

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [error, result] = await httpClient.get("/users");

            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(500);
            expect
                .soft(error?.message)
                .toContain("Boom in response interceptor");
            expect(result).toBe(null);
        });

        it("should remove interceptor when unsubscribe function called", async () => {
            const unsubscribe = httpClient.onResponse((response) => {
                response.data = { via: "interceptor" } as unknown as {
                    via: string;
                };
                return response;
            });

            // Eject it
            unsubscribe();

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [err, data] = await httpClient.get("/users");

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true }); // unchanged since interceptor removed
        });
    });
});
