import { describe, expect, it } from "vitest";
import { HttpClient } from "~/http-client";
import { ExtendedAxiosInstance } from "~/http-client/httpclient";

describe("HttpClient", () => {
    describe("Constructor", () => {
        it("should create HttpClient instance with required config", () => {
            const httpClient = new HttpClient({
                baseUrl: "https://example.com",
            });

            expect(httpClient.axiosInstance.defaults.baseURL).toBe(
                "https://example.com"
            );
        });

        it("should create HttpClient with custom headers", () => {
            const CUSTOM_HEADER = "X-Custom";

            const httpClient = new HttpClient({
                baseUrl: "https://example.com",
                headers: {
                    [CUSTOM_HEADER]: "My Header",
                },
            });

            expect
                .soft(httpClient.axiosInstance.defaults.headers)
                .toHaveProperty(CUSTOM_HEADER);

            expect
                .soft(httpClient.axiosInstance.defaults.headers)
                .toMatchObject({
                    [CUSTOM_HEADER]: "My Header",
                });
        });

        it("should create HttpClient with timeout configuration", () => {
            const httpClient = new HttpClient({
                baseUrl: "https://example.com",
                timeout: 1000,
            });

            expect(httpClient.axiosInstance.defaults.timeout).toBe(1000);
        });

        it("should create HttpClient with logRequests enabled", () => {
            const httpClient = new HttpClient({
                baseUrl: "https://example.com",
                logRequests: true,
            });

            expect(
                (httpClient.axiosInstance as ExtendedAxiosInstance).defaults
                    .logRequests
            ).toBe(true);
        });
    });
});
