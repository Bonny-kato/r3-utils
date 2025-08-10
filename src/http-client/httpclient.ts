import axios, {
    AxiosRequestConfig,
    AxiosResponse,
    Method as HttpMethod,
    RawAxiosRequestHeaders,
} from "axios";
import { ErrorType, tryCatchHttp } from "./try-catch-http";

/**
 * Configuration options for initializing the HttpClient
 */
type HttpRequestConfig = {
    /** Base URL for all API requests */
    baseUrl: string;
    /** Optional headers to include with all requests */
    headers?: RawAxiosRequestHeaders;
    /** Whether to log request details to the console */
    logRequests?: boolean;
    /** Request timeout in milliseconds */
    timeout?: Milliseconds;
};

/** Type alias for milliseconds */
type Milliseconds = number;

/**
 * Configuration options for individual HTTP method requests
 */
interface HttpMethodRequestConfig
    extends Partial<Omit<HttpRequestConfig, "logRequests">> {
    /** AbortSignal to cancel request */
    signal?: AbortSignal;
    /** Auth token to include in request */
    token?: string;
}

/**
 * Internal request configuration options
 */
interface RequestOptions extends HttpMethodRequestConfig {
    /** Request payload data */
    data?: object;
    /** API endpoint path */
    endpoint: string;
    /** HTTP method */
    method: HttpMethod;
}

/**
 * HTTP client for making API requests with built-in error handling and type safety.
 *
 * Features:
 * - Type-safe request/response handling
 * - Automatic error handling and standardization
 * - Bearer token auth support
 * - Request logging
 * - Request cancellation support
 * - Configurable timeouts
 *
 * @example
 * ```ts
 * const client = new HttpClient({
 *   baseUrl: 'https://api.example.com',
 *   logRequests: true
 * });
 *
 * // GET request
 * const [error, data] = await client.get<UserData>('/users/123');
 *
 * // POST request with data
 * const [error, result] = await client.post<Response>('/items', {
 *   name: 'New Item'
 * });
 * ```
 */
export class HttpClient {
    #globalConfig: HttpRequestConfig;

    /**
     * Creates a new HttpClient instance
     * @param config - Client configuration options
     */
    constructor(config: HttpRequestConfig) {
        this.#globalConfig = config;
    }

    /**
     * Makes a POST request to the specified endpoint
     * @param endpoint - API endpoint path
     * @param data - Request payload
     * @param config - Additional request configuration
     * @returns Tuple of [error, response]
     */
    post = async <TData, TError extends ErrorType = ErrorType>(
        endpoint: string,
        data: object,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TData, TError>({
            data,
            endpoint,
            method: "post",
            ...config,
        });
    };

    // Todo: Accept data as optional see https://www.rfc-editor.org/rfc/rfc9110.html#name-delete
    /**
     * Makes a DELETE request to the specified endpoint
     * @param endpoint - API endpoint path
     * @param config - Additional request configuration
     * @returns Tuple of [error, response]
     */
    delete = async <TData, TError extends ErrorType = ErrorType>(
        endpoint: string,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TData, TError>({
            endpoint,
            method: "DELETE",
            ...config,
        });
    };

    /**
     * Makes a PUT request to the specified endpoint
     * @param endpoint - API endpoint path
     * @param data - Request payload
     * @param config - Additional request configuration
     * @returns Tuple of [error, response]
     */
    put = async <TData, TError extends ErrorType = ErrorType>(
        endpoint: string,
        data: object,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TData, TError>({
            data,
            endpoint,
            method: "PUT",
            ...config,
        });
    };

    /**
     * Makes a PATCH request to the specified endpoint
     * @param endpoint - API endpoint path
     * @param data - Request payload
     * @param config - Additional request configuration
     * @returns Tuple of [error, response]
     */
    patch = async <TData, TError extends ErrorType = ErrorType>(
        endpoint: string,
        data: object,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TData, TError>({
            data,
            endpoint,
            method: "PATCH",
            ...config,
        });
    };

    /**
     * Makes a GET request to the specified endpoint
     * @param endpoint - API endpoint path
     * @param config - Additional request configuration
     * @returns Tuple of [error, response]
     */
    get = async <TData, TError extends ErrorType = ErrorType>(
        endpoint: string,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TData, TError>({
            ...config,
            endpoint,
            method: "get",
        });
    };

    /**
     * Logs request details if logging is enabled
     */
    #logRequest = (config: AxiosRequestConfig) => {
        if (this.#globalConfig.logRequests) {
            console.log(config);
        }
    };

    /**
     * Makes an HTTP request with the given configuration
     * @param options - Request configuration options
     * @returns Promise resolving to [error, response] tuple
     */
    async #request<TData, TError extends ErrorType = ErrorType>({
        baseUrl,
        endpoint,
        method,
        token,
        headers,
        ...otherProps
    }: RequestOptions) {
        const $baseUrl = baseUrl ?? this.#globalConfig.baseUrl;

        const config: AxiosRequestConfig = {
            ...otherProps,
            headers: {
                ...this.#globalConfig.headers,
                Authorization: token ? `Bearer ${token}` : undefined,
                ...headers,
            },
            method,
            url: $baseUrl + endpoint,
        };

        return tryCatchHttp<TData, TError>(async () => {
            this.#logRequest(config);

            const response: AxiosResponse<TData> = await axios(config);
            return response.data;
        })();
    }
}
