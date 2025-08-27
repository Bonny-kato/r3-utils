import AxiosMockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";
import {
    HTTP_BAD_REQUEST,
    HTTP_CREATED,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_SERVICE_NOT_AVAILABLE,
} from "~/http-client/status-code";

describe("HttpClient", () => {
    describe("Response Handling", () => {
        const BASE_URL = "https://example.com/api/v1";
        const SUCCESS_RESPONSE = {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
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

        it("should return response data on successful request", async () => {
            mockAxios.onGet(`${BASE_URL}/users/1`).reply(200, SUCCESS_RESPONSE);

            const [error, data] = await httpClient.get("/users/1");

            expect.soft(error).toBe(null);
            expect(data).toMatchObject(SUCCESS_RESPONSE);
        });

        it("should handle 404 errors", async () => {
            mockAxios.onGet(`${BASE_URL}/users/999`).reply(404, {
                message: "User not found",
            });

            const [error, data] = await httpClient.get("/users/999");

            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(404);
            expect.soft(error?.message).toBeDefined();

            expect(data).toBe(null);
        });

        it("should handle 500 server errors", async () => {
            mockAxios.onGet(`${BASE_URL}/users/1`).reply(500, {
                message: "Internal Server Error",
            });

            const [error, data] = await httpClient.get("/users/1");

            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect.soft(error?.message).toContain("Internal Server Error");
            expect(data).toBe(null);
        });

        it("should handle network errors", async () => {
            mockAxios.onGet(`${BASE_URL}/users/1`).networkError();

            const [error, data] = await httpClient.get("/users/1");

            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect.soft(error?.message).toBe("Network Error");
            expect(data).toBe(null);
        });

        it("should handle timeout errors.", async () => {
            mockAxios.onGet(`${BASE_URL}/users/1`).timeout();

            const [error, data] = await httpClient.get("/users/1");

            expect.soft(error).not.toBe(null);
            expect.soft(error?.status).toBe(HTTP_SERVICE_NOT_AVAILABLE);
            expect.soft(error?.message).toBeDefined();
            expect(data).toBe(null);
        });

        it("should return error tuple format [error, null] on failure", async () => {
            mockAxios.onGet(`${BASE_URL}/users/1`).reply(HTTP_BAD_REQUEST, {
                message: "Bad Request",
            });

            const response = await httpClient.get("/users/1");

            // Verify tuple format for failure
            expect(Array.isArray(response)).toBe(true);
            expect.soft(response[0]).not.toBe(null);
            expect.soft(response[0]?.status).toBe(HTTP_BAD_REQUEST);
            expect.soft(response[0]?.message).toBeDefined();
            expect(response[1]).toBe(null);
        });

        it("should return success tuple format [null, data] on success", async () => {
            mockAxios
                .onPost(`${BASE_URL}/users`)
                .reply(HTTP_CREATED, SUCCESS_RESPONSE);

            const response = await httpClient.post("/users", {
                name: "John Doe",
                email: "john@example.com",
            });

            // Verify tuple format for success
            expect(Array.isArray(response)).toBe(true);
            expect.soft(response[0]).toBe(null);

            expect(response[1]).toMatchObject(SUCCESS_RESPONSE);
        });
    });
});
