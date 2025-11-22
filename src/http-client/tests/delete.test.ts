import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";

describe("HttpClient", () => {
    describe("DELETE", () => {
        const BASE_URL = "https://example.com/api/v1";
        const DELETE_RESPONSE = {
            message: "User deleted successfully",
        };

        let httpClient: HttpClient;
        let mockAxios: AxiosMockAdapter;

        beforeEach(() => {
            httpClient = new HttpClient({
                baseUrl: BASE_URL,
            });

            mockAxios = new AxiosMockAdapter(httpClient.axiosInstance);
            mockAxios.resetHistory();
        });

        it("should make successful DELETE request", async () => {
            mockAxios
                .onDelete(`${BASE_URL}/user/1`)
                .reply(200, DELETE_RESPONSE);

            const [error, result] = await httpClient.delete("/user/1");
            const request = mockAxios.history.delete[0];

            expect.soft(error).toBe(null);
            expect.soft(request.method?.toUpperCase()).toBe("DELETE");

            expect.soft(request.url).toBe(`/user/1`);
            expect(result).toMatchObject(DELETE_RESPONSE);
        });

        it("should make DELETE request with custom headers", async () => {
            const API_KEY = "my-api-key";

            mockAxios
                .onDelete(`${BASE_URL}/user/1`)
                .reply(200, DELETE_RESPONSE);
            const [error, results] = await httpClient.delete("/user/1", {
                headers: {
                    "X-API-KEY": API_KEY,
                },
            });

            const request = mockAxios.history.delete[0];

            expect.soft(error).toBe(null);
            expect.soft(results).toMatchObject(DELETE_RESPONSE);
            expect.soft(request.method?.toUpperCase()).toBe("DELETE");

            expect(request.headers).toMatchObject({
                "X-API-KEY": API_KEY,
            });
        });

        it("should make DELETE request with token authorization", async () => {
            const TOKEN = "my-token";

            mockAxios
                .onDelete(`${BASE_URL}/user/1`)
                .reply(200, DELETE_RESPONSE);
            const [error, results] = await httpClient.delete("/user/1", {
                headers: {
                    Authorization: `Bearer ${TOKEN}`,
                },
            });

            const request = mockAxios.history.delete[0];

            expect.soft(error).toBe(null);
            expect.soft(results).toMatchObject(DELETE_RESPONSE);
            expect.soft(request.method?.toUpperCase()).toBe("DELETE");

            expect(request.headers).toMatchObject({
                Authorization: `Bearer ${TOKEN}`,
            });
        });

        it("should handle DELETE request errors", async () => {
            mockAxios.onDelete(`${BASE_URL}/user/1`).reply(500, {
                message: "Internal Server Error",
            });

            const [error, result] = await httpClient.delete("/user/1");

            const request = mockAxios.history.delete[0];

            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(500);

            expect.soft(error?.message).toBeDefined();
            expect.soft(typeof error?.message).toBe("string");

            expect.soft(request.method?.toUpperCase()).toBe("DELETE");
            expect(result).toBe(null);
        });
    });
});
