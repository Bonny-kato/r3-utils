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

type OnRequestRejected = (error: unknown) => unknown;

export interface ExtendedAxiosInstance extends Omit<AxiosInstance, "defaults"> {
    defaults: AxiosInstance["defaults"] & {
        logRequests?: boolean;
    };
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
        rejected?: (error: unknown) => unknown
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
            method: "POST",
            ...config,
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

        return tryCatchHttp<TResponse, TError>(async () => {
            this.#logRequest(config);
            const response: AxiosResponse<TResponse> =
                await this.#axios.request<TResponse>(config);
            return response.data;
        })();
    }
}
