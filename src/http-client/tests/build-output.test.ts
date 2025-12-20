import { describe, expect, it } from "vitest";

describe("HTTP Client Build Output", () => {
    it("should export expected http-client API from dist", async () => {
        const dist = await import("../../../dist/http-client/index.js");

        const expectedExports = [
            "HttpClient",
            "tryCatchHttp",
            "HTTP_CONTINUE",
            "HTTP_SWITCHING_PROTOCOLS",
            "HTTP_PROCESSING",
            "HTTP_EARLY_HINTS",
            "HTTP_OK",
            "HTTP_CREATED",
            "HTTP_ACCEPTED",
            "HTTP_NON_AUTHORITATIVE_INFORMATION",
            "HTTP_NO_CONTENT",
            "HTTP_RESET_CONTENT",
            "HTTP_PARTIAL_CONTENT",
            "HTTP_MULTI_STATUS",
            "HTTP_ALREADY_REPORTED",
            "HTTP_IM_USED",
            "HTTP_MULTIPLE_CHOICES",
            "HTTP_MOVED_PERMANENTLY",
            "HTTP_FOUND",
            "HTTP_SEE_OTHER",
            "HTTP_NOT_MODIFIED",
            "HTTP_USE_PROXY",
            "HTTP_TEMPORARY_REDIRECT",
            "HTTP_PERMANENT_REDIRECT",
            "HTTP_BAD_REQUEST",
            "HTTP_UNAUTHORIZED",
            "HTTP_PAYMENT_REQUIRED",
            "HTTP_FORBIDDEN",
            "HTTP_NOT_FOUND",
            "HTTP_METHOD_NOT_ALLOWED",
            "HTTP_NOT_ACCEPTABLE",
            "HTTP_PROXY_AUTHENTICATION_REQUIRED",
            "HTTP_REQUEST_TIMEOUT",
            "HTTP_CONFLICT",
            "HTTP_GONE",
            "HTTP_LENGTH_REQUIRED",
            "HTTP_PRECONDITION_FAILED",
            "HTTP_PAYLOAD_TOO_LARGE",
            "HTTP_URI_TOO_LONG",
            "HTTP_UNSUPPORTED_MEDIA_TYPE",
            "HTTP_RANGE_NOT_SATISFIABLE",
            "HTTP_EXPECTATION_FAILED",
            "HTTP_IM_A_TEAPOT",
            "HTTP_MISDIRECTED_REQUEST",
            "HTTP_UNPROCESSABLE_ENTITY",
            "HTTP_LOCKED",
            "HTTP_FAILED_DEPENDENCY",
            "HTTP_TOO_EARLY",
            "HTTP_UPGRADE_REQUIRED",
            "HTTP_PRECONDITION_REQUIRED",
            "HTTP_TOO_MANY_REQUESTS",
            "HTTP_REQUEST_HEADER_FIELDS_TOO_LARGE",
            "HTTP_UNAVAILABLE_FOR_LEGAL_REASONS",
            "HTTP_INTERNAL_SERVER_ERROR",
            "HTTP_NOT_IMPLEMENTED",
            "HTTP_BAD_GATEWAY",
            "HTTP_SERVICE_NOT_AVAILABLE",
            "HTTP_GATEWAY_TIMEOUT",
            "HTTP_VERSION_NOT_SUPPORTED",
            "HTTP_VARIANT_ALSO_NEGOTIATES",
            "HTTP_INSUFFICIENT_STORAGE",
            "HTTP_LOOP_DETECTED",
            "HTTP_NOT_EXTENDED",
            "HTTP_NETWORK_AUTHENTICATION_REQUIRED",
            "NETWORK_ERROR_CODE",
            "OFFLINE_ERROR_CODE",
        ];

        for (const key of expectedExports) {
            expect(key in dist).toBe(true);
        }
    });

    it("should have correct representative status code values", async () => {
        const { HTTP_OK, HTTP_NOT_FOUND, OFFLINE_ERROR_CODE } = await import(
            "../../../dist/http-client/index.js"
        );
        expect(HTTP_OK).toBe(200);
        expect(HTTP_NOT_FOUND).toBe(404);
        expect(OFFLINE_ERROR_CODE).toBe(600);
    });
});
