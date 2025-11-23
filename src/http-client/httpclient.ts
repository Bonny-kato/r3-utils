import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Method as HttpMethod,
    InternalAxiosRequestConfig,
} from "axios";
import { ErrorType, tryCatchHttp } from "./try-catch-http";

export type BaseUrl = `https://${string}` | `http://${string}`;
export type Endpoint = `/${string}` | `${BaseUrl}/${string}`;

type OnRequestFulfilled<TBody = unknown> = (
    config: InternalAxiosRequestConfig<TBody>
) =>
    | InternalAxiosRequestConfig<TBody>
    | Promise<InternalAxiosRequestConfig<TBody>>;

type OnRequestRejected = (error: unknown) => never;

export interface ExtendedAxiosInstance extends Omit<AxiosInstance, "defaults"> {
    defaults: AxiosInstance["defaults"] & {
        logRequests?: boolean;
    };
}

/**
 * Configuration options for request retry behavior
 */
export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Initial delay in milliseconds before first retry */
    retryDelay?: number;
    /** Whether to use exponential backoff for retry delays */
    exponentialBackoff?: boolean;
    /** HTTP status codes that should trigger a retry */
    retryableStatuses?: number[];
    /** Function to determine if an error should trigger a retry */
    shouldRetry?: (error: unknown, attemptNumber: number) => boolean;
}

/**
 * Configuration options for initializing the HttpClient
 */
export interface HttpRequestConfig<TBody = unknown>
    extends Omit<AxiosRequestConfig<TBody>, "method" | "url" | "baseURL"> {
    /** Base URL for all API requests */
    baseUrl?: BaseUrl;
    /** Whether to log request details to the console */
    logRequests?: boolean;
    /** Retry configuration for failed requests */
    retry?: RetryConfig;
    /** Enable request deduplication to prevent duplicate in-flight requests */
    enableDeduplication?: boolean;
}

/**
 * Configuration options for individual HTTP method requests
 */
type HttpMethodRequestConfig<TBody = unknown> = Partial<
    Omit<HttpRequestConfig<TBody>, "logRequests">
>;

/**
 * Internal request configuration options
 */
interface RequestConfig<TBody = unknown>
    extends HttpMethodRequestConfig<TBody> {
    /** API endpoint path */
    endpoint: Endpoint;
    /** HTTP method */
    method: HttpMethod;
}

type RequestInterceptorOptions = {
    runWhen?: (config: InternalAxiosRequestConfig) => boolean; // Also update this
    synchronous?: boolean;
};

export class HttpClient {
    #globalConfig: HttpRequestConfig;
    #axios: AxiosInstance;
    #inFlightRequests: Map<string, Promise<unknown>> = new Map();

    /**
     * Creates a new HttpClient instance
     * @param config - Client configuration options
     */
    constructor(config: HttpRequestConfig) {
        this.#globalConfig = config;

        // Dedicated axios instance per client
        const { baseUrl, headers, ...rest } = config;
        this.#axios = axios.create({
            baseURL: baseUrl,
            headers,
            ...rest,
        });
    }

    /**
     * DO NOT USE
     *
     * Exposes the internal axios instance for testing purposes
     * @internal - This should only be used for testing
     */
    get axiosInstance(): AxiosInstance {
        return this.#axios;
    }

    /**
     * Simple public API for interceptors
     * Returns an unsubscribe function to eject the interceptor.
     */
    onRequest(
        fulfilled: OnRequestFulfilled,
        rejected?: OnRequestRejected,
        options?: RequestInterceptorOptions
    ): () => void {
        const id = this.#axios.interceptors.request.use(
            fulfilled,
            rejected,
            options
        );
        return () => this.#axios.interceptors.request.eject(id);
    }

    onResponse(
        fulfilled: (
            response: AxiosResponse
        ) => AxiosResponse | Promise<AxiosResponse>,
        rejected?: (error: unknown) => never
    ): () => void {
        const id = this.#axios.interceptors.response.use(fulfilled, rejected);
        return () => this.#axios.interceptors.response.eject(id);
    }

    /**
     * Makes a POST request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    post = async <
        TResponse,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
    >(
        endpoint: Endpoint,
        body: TBody,
        config?: HttpMethodRequestConfig<TBody>
    ) => {
        return this.#request<TResponse, TBody, TError>({
            data: body,
            endpoint,
            ...config,
            method: "POST",
        });
    };

    /**
     * Makes a DELETE request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    delete = async <TResponse, TError extends ErrorType = ErrorType>(
        endpoint: Endpoint,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TResponse, unknown, TError>({
            endpoint,
            method: "DELETE",
            ...config,
        });
    };

    /**
     * Makes a PUT request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    put = async <
        TResponse,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
    >(
        endpoint: Endpoint,
        body: TBody,
        config?: HttpMethodRequestConfig<TBody>
    ) => {
        return this.#request<TResponse, TBody, TError>({
            data: body,
            endpoint,
            method: "PUT",
            ...config,
        });
    };

    /**
     * Makes a PATCH request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    patch = async <
        TResponse,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
    >(
        endpoint: Endpoint,
        body: TBody,
        config?: HttpMethodRequestConfig<TBody>
    ) => {
        return this.#request<TResponse, TBody, TError>({
            data: body,
            endpoint,
            method: "PATCH",
            ...config,
        });
    };

    /**
     * Makes a GET request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    get = async <TResponse, TError extends ErrorType = ErrorType>(
        endpoint: Endpoint,
        config?: HttpMethodRequestConfig
    ) => {
        return this.#request<TResponse, unknown, TError>({
            ...config,
            endpoint,
            method: "GET",
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

    #mergeConfig = <TBody = unknown>({
        baseUrl,
        endpoint,
        method,
        headers,
        ...otherProps
    }: RequestConfig<TBody>) => {
        const {
            baseUrl: globalUrl,
            headers: globalHeader,
            ...otherGlobalConfig
        } = this.#globalConfig;

        const effectiveBaseURL = baseUrl ?? globalUrl;

        const isAbsolute =
            endpoint.startsWith("http://") || endpoint.startsWith("https://");

        return {
            ...otherGlobalConfig,
            ...otherProps,
            baseURL: isAbsolute ? undefined : effectiveBaseURL,
            headers: {
                ...globalHeader,
                ...headers,
            },
            method,
            url: endpoint, // use relative endpoint; baseURL handles the prefix
        } satisfies AxiosRequestConfig;
    };

    #generateRequestKey = (config: AxiosRequestConfig): string => {
        const { method, url, baseURL, params, data } = config;
        return JSON.stringify({ method, url, baseURL, params, data });
    };

    #sleep = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    #shouldRetryRequest = (
        error: unknown,
        attemptNumber: number,
        retryConfig?: RetryConfig
    ): boolean => {
        if (!retryConfig || attemptNumber >= (retryConfig.maxRetries ?? 0)) {
            return false;
        }

        if (retryConfig.shouldRetry) {
            return retryConfig.shouldRetry(error, attemptNumber);
        }

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status) {
                const retryableStatuses = retryConfig.retryableStatuses ?? [
                    408, 429, 500, 502, 503, 504,
                ];
                return retryableStatuses.includes(status);
            }
            return !error.response;
        }

        return false;
    };

    #getRetryDelay = (
        attemptNumber: number,
        retryConfig?: RetryConfig
    ): number => {
        const baseDelay = retryConfig?.retryDelay ?? 1000;
        if (retryConfig?.exponentialBackoff) {
            return baseDelay * Math.pow(2, attemptNumber - 1);
        }
        return baseDelay;
    };

    async #executeWithRetry<TResponse>(
        executor: () => Promise<TResponse>,
        retryConfig?: RetryConfig
    ): Promise<TResponse> {
        let lastError: unknown;
        const maxAttempts = (retryConfig?.maxRetries ?? 0) + 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await executor();
            } catch (error) {
                lastError = error;
                if (
                    attempt < maxAttempts &&
                    this.#shouldRetryRequest(error, attempt, retryConfig)
                ) {
                    const delay = this.#getRetryDelay(attempt, retryConfig);
                    await this.#sleep(delay);
                    continue;
                }
                throw error;
            }
        }

        throw lastError;
    }

    async #executeWithDeduplication<TResponse>(
        requestKey: string,
        executor: () => Promise<TResponse>
    ): Promise<TResponse> {
        const existingRequest = this.#inFlightRequests.get(requestKey);
        if (existingRequest) {
            return existingRequest as Promise<TResponse>;
        }

        const requestPromise = executor().finally(() => {
            this.#inFlightRequests.delete(requestKey);
        });

        this.#inFlightRequests.set(requestKey, requestPromise);
        return requestPromise;
    }

    /**
     * Makes an HTTP request with the given configuration
     * @returns Promise resolving to [error, response] tuple
     */
    async #request<
        TResponse,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
    >(requestConfig: RequestConfig<TBody>) {
        const config = this.#mergeConfig<TBody>(requestConfig);
        const retryConfig = this.#globalConfig.retry;
        const enableDeduplication =
            this.#globalConfig.enableDeduplication ?? false;

        const executor = async (): Promise<TResponse> => {
            this.#logRequest(config);
            const response: AxiosResponse<TResponse> =
                await this.#axios.request<TResponse>(config);
            return response.data;
        };

        return tryCatchHttp<TResponse, TError>(async () => {
            if (enableDeduplication && config.method?.toUpperCase() === "GET") {
                const requestKey = this.#generateRequestKey(config);
                return this.#executeWithDeduplication(requestKey, () =>
                    this.#executeWithRetry(executor, retryConfig)
                );
            }

            return this.#executeWithRetry(executor, retryConfig);
        })();
    }
}
