import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "~/http-client";

const BASE_URL = "https://example.com/api";

describe("HttpClient", () => {
    describe("Logging", () => {
        let mockAxios: AxiosMockAdapter;

        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it("should log requests when logRequests is true", async () => {
            const httpClient = new HttpClient({
                baseUrl: BASE_URL,
                logRequests: true,
            });
            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();

            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const [err, data] = await httpClient.get("/users");

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect(logSpy).toHaveBeenCalledTimes(1);

            const loggedArg = logSpy.mock.calls[0][0] as Record<
                string,
                unknown
            >;
            expect.soft(loggedArg).toMatchObject({
                baseURL: BASE_URL,
                method: "GET",
                url: "/users",
            });
        });

        it("should not log requests when logRequests is false", async () => {
            const httpClient = new HttpClient({
                baseUrl: BASE_URL,
                logRequests: false,
            });
            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();
            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const [err, data] = await httpClient.get("/users");

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect(logSpy).not.toHaveBeenCalled();
        });

        it("should not log requests when logRequests is undefined", async () => {
            const httpClient = new HttpClient({ baseUrl: BASE_URL }); // no logRequests
            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();
            mockAxios.onGet(`${BASE_URL}/users`).reply(200, { ok: true });

            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const [err, data] = await httpClient.get("/users");

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ ok: true });
            expect(logSpy).not.toHaveBeenCalled();
        });

        it("should log correct request configuration", async () => {
            const httpClient = new HttpClient({
                baseUrl: BASE_URL,
                headers: {
                    Accept: "application/json",
                    "X-Global": "1",
                },
                logRequests: true,
                timeout: 1234,
            });
            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();

            const BODY = { name: "John" };
            mockAxios.onPost(`${BASE_URL}/users`).reply(201, { created: true });

            const logSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            const [err, data] = await httpClient.post("/users", BODY, {
                headers: {
                    Accept: "application/vnd.custom+json",
                    "X-Per-Call": "2",
                },
            });

            expect.soft(err).toBe(null);
            expect.soft(data).toMatchObject({ created: true });
            expect(logSpy).toHaveBeenCalledTimes(1);

            const logged = logSpy.mock.calls[0][0] as Record<string, unknown>;

            // Basic shape
            expect.soft(logged.method).toBe("POST");
            expect.soft(logged.url).toBe("/users");
            expect.soft(logged.baseURL).toBe(BASE_URL);

            // Headers merged (per-call overrides global on conflict)
            expect.soft(logged.headers).toMatchObject({
                Accept: "application/vnd.custom+json",
                "X-Global": "1",
                "X-Per-Call": "2",
            });

            // Body present in logged config
            expect.soft(logged.data).toMatchObject(BODY);

            // Ensure arbitrary other config properties are preserved (e.g., timeout)
            expect.soft(logged.timeout).toBe(1234);
        });
    });
});
