import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";

const BASE_URL = "https://example.com/api";

describe("HttpClient", () => {
    describe("Request Interceptors", () => {
        let httpClient: HttpClient;
        let mockAxios: AxiosMockAdapter;

        beforeEach(() => {
            httpClient = new HttpClient({ baseUrl: BASE_URL });
            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();
        });

        it("should add request interceptor successfully", () => {
            const unsubscribe = httpClient.onRequest((config) => config);
            expect(typeof unsubscribe).toBe("function");
            // Cleanup
            unsubscribe();
        });

        it("should execute request interceptor before request", async () => {
            // Add a header in interceptor
            httpClient.onRequest((config) => {
                // @ts-expect-error - intentionally setting an invalid header type
                config.headers = {
                    ...(config.headers || {}),
                    "X-Intercepted": "yes",
                } as Record<string, unknown>;
                return config;
            });

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [err, data] = await httpClient.get("/users");

            const req = mockAxios.history.get[0];
            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect(req.headers).toMatchObject({ "X-Intercepted": "yes" });
        });

        it("should modify request config in interceptor", async () => {
            httpClient.onRequest((config) => {
                // Modify URL and add a header
                config.url = "/users?from=interceptor";
                // @ts-expect-error - intentionally setting an invalid header type
                config.headers = {
                    ...(config.headers || {}),
                    "X-Modified": "true",
                } as Record<string, unknown>;
                return config;
            });

            mockAxios
                .onGet(`${BASE_URL}/users?from=interceptor`)
                .reply(200, { changed: true });

            const [err, data] = await httpClient.get("/users");

            const req = mockAxios.history.get[0];
            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ changed: true });
            expect(req.headers).toMatchObject({ "X-Modified": "true" });
            expect(
                new URL(req.url!, req.baseURL).searchParams.get("from")
            ).toBe("interceptor");
        });

        it("should handle request interceptor errors", async () => {
            httpClient.onRequest(() => {
                throw new Error("Boom in interceptor");
            });

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [error, data] = await httpClient.get("/users");
            // Since interceptor throws before request, our wrapper should catch and return tuple
            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(500);
            expect.soft(error?.message).toContain("Boom in interceptor");
            expect(data).toBe(null);
        });

        it("should remove interceptor when unsubscribe function called", async () => {
            const unsubscribe = httpClient.onRequest((config) => {
                // @ts-expect-error - intentionally setting an invalid header type
                config.headers = {
                    ...(config.headers || {}),
                    "X-Temp": "1",
                } as Record<string, unknown>;
                return config;
            });

            // Remove it
            unsubscribe();

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [err, data] = await httpClient.get("/users");
            const req = mockAxios.history.get[0];

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect(req.headers?.["X-Temp"]).toBeUndefined();
        });

        it("should support runWhen option in request interceptor", async () => {
            httpClient.onRequest(
                (config) => {
                    // @ts-expect-error - intentionally setting an invalid header type
                    config.headers = {
                        ...(config.headers || {}),
                        "X-RunWhen": "applied",
                    } as Record<string, unknown>;
                    return config;
                },
                undefined,
                {
                    runWhen: (cfg) => (cfg.url || "").includes("/apply"),
                }
            );

            mockAxios.onGet(`${BASE_URL}/apply`).reply(200, { ok: true });
            mockAxios.onGet(`${BASE_URL}/skip`).reply(200, { ok: true });

            const [e1] = await httpClient.get("/apply");
            const [e2] = await httpClient.get("/skip");

            const req1 = mockAxios.history.get[0];
            const req2 = mockAxios.history.get[1];

            expect.soft(e1).toBe(null);
            expect.soft(e2).toBe(null);
            expect(req1.headers).toMatchObject({ "X-RunWhen": "applied" });
            expect(req2.headers?.["X-RunWhen"]).toBeUndefined();
        });

        it("should support synchronous option in request interceptor", async () => {
            httpClient.onRequest(
                (config) => {
                    // @ts-expect-error - intentionally setting an invalid header type
                    config.headers = {
                        ...(config.headers || {}),
                        "X-Sync": "true",
                    } as Record<string, unknown>;
                    return config;
                },
                undefined,
                { synchronous: true }
            );

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const [err, data] = await httpClient.get("/users");
            const req = mockAxios.history.get[0];

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect(req.headers).toMatchObject({ "X-Sync": "true" });
        });
    });
});
