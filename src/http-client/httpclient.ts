import axios, { AxiosResponse } from "axios";
import { checkIsDevMode } from "../utils";
import { tryCatchHttp } from "./try-catch-http";

/**
 * HTTP methods supported by the HttpClient
 */
type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Configuration object for HTTP requests
 */
interface RequestConfig {
    /** HTTP method to use */
    method: HttpMethod;
    /** Full URL including base URL and endpoint */
    url: string;
    /** Request headers */
    headers: {
        /** Authorization header with Bearer token */
        Authorization: string;
        /** Content type header, set automatically based on the data type */
        "Content-Type"?: "application/json" | "multipart/form-data";
    };
    /** Request body data */
    data: undefined | object | FormData;
}

/**
 * HttpClient class for making API requests
 *
 * This class provides a simple interface for making HTTP requests to a REST API.
 * It handles authentication, error handling, and request configuration.
 */
export class HttpClient {
    /**
     * Makes a GET request to the specified endpoint
     *
     * @param endpoint - The API endpoint to call (e.g., "/users")
     * @param token - Optional authentication token
     * @returns A promise that resolves to a tuple of [error, data]
     */
    get = tryCatchHttp(async <T = any>(endpoint: string, token?: string): Promise<T> => {
        return this.request<T>("get", endpoint, undefined, token);
    });
    /**
     * Makes a POST request to the specified endpoint
     *
     * @param endpoint - The API endpoint to call
     * @param data - The data to send with the request
     * @param token - Optional authentication token
     * @returns A promise that resolves to a tuple of [error, data]
     */
    post = tryCatchHttp(
        async <T = any>(endpoint: string, data: object, token?: string): Promise<T> => {
            return this.request<T>("post", endpoint, data, token);
        }
    );
    /**
     * Makes a DELETE request to the specified endpoint
     *
     * @param endpoint - The API endpoint to call
     * @param token - Optional authentication token
     * @returns A promise that resolves to a tuple of [error, data]
     */
    delete = tryCatchHttp(async <T = any>(endpoint: string, token?: string): Promise<T> => {
        return this.request<T>("delete", endpoint, undefined, token);
    });
    /**
     * Makes a PUT request to the specified endpoint
     *
     * @param endpoint - The API endpoint to call
     * @param data - The data to send with the request
     * @param token - Optional authentication token
     * @returns A promise that resolves to a tuple of [error, data]
     */
    put = tryCatchHttp(
        async <T = any>(endpoint: string, data: object, token?: string): Promise<T> => {
            return this.request<T>("put", endpoint, data, token);
        }
    );
    /**
     * Makes a PATCH request to the specified endpoint
     *
     * @param endpoint - The API endpoint to call
     * @param data - The data to send with the request
     * @param token - Optional authentication token
     * @returns A promise that resolves to a tuple of [error, data]
     */
    patch = tryCatchHttp(
        async <T = any>(endpoint: string, data: object, token?: string): Promise<T> => {
            return this.request<T>("patch", endpoint, data, token);
        }
    );
    /** Base URL for all API requests */
    private readonly baseUrl: string;

    /**
     * Creates a new HttpClient instance
     *
     * @param baseUrl - The base URL for all API requests (e.g., "https://api.example.com/v1")
     */
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Makes an HTTP request to the specified endpoint
     *
     * @param method - The HTTP method to use
     * @param endpoint - The API endpoint to call
     * @param data - Optional data to send with the request
     * @param token - Optional authentication token
     * @returns The response data from the API
     */
    private async request<T>(
        method: HttpMethod,
        endpoint: string,
        data?: object,
        token?: string
    ): Promise<T> {
        const isDevMode = checkIsDevMode();

        const config: RequestConfig = {
            method,
            url: this.baseUrl + endpoint,
            headers: {
                Authorization: token ? `Bearer ${token}` : "",
            },
            data: undefined,
        };

        if (data) {
            config.data = data;

            // Set content type based on data type
            if (data instanceof FormData) {
                config.headers["Content-Type"] = "multipart/form-data";
            } else {
                config.headers["Content-Type"] = "application/json";
            }

            // Log request data in development mode only
            if (isDevMode) {
                console.debug("[Request Data]:", data);
            }
        }

        // Log request details in development mode only
        if (isDevMode) {
            console.debug(`[${method.toUpperCase()}] ${config.url}`);
            if (token) {
                console.debug("[Auth] Token present");
            }
        }

        const response: AxiosResponse<T> = await axios(config);
        return response.data;
    }
}
