import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Method as HttpMethod,
    InternalAxiosRequestConfig,
    ResponseType,
} from "axios";
import {
    ErrorMode,
    ErrorType,
    ModernHttpError,
    tryCatchHttp,
    TryCatchHttpReturnType,
} from "./try-catch-http";

/**
 * @deprecated Use plain `string` instead.
 */
export type BaseUrl = string;

/**
 * @deprecated Use plain `string` instead.
 */
export type Endpoint = string;

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
 * Configuration options for initializing the HttpClient
 */
export interface HttpRequestConfig<TBody = unknown>
    extends Omit<AxiosRequestConfig<TBody>, "method" | "url" | "baseURL"> {
    /** Base URL for all API requests */
    baseUrl?: string;
    /** Whether to log request details to the console */
    logRequests?: boolean;
}

/**
 * Configuration options for individual HTTP method requests
 */
export type HttpMethodRequestConfig<TBody = unknown> = Partial<
    Omit<HttpRequestConfig<TBody>, "logRequests">
> & {
    /**
     * Error shape for this call only.
     * - `"legacy"` (default): current ErrorType + root-spread + always-number status
     * - `"modern"`: discriminated honest error (`kind`, `data` as-is, `cause`)
     */
    errorMode?: ErrorMode;
};

/**
 * Internal request configuration options
 */
interface RequestConfig<TBody = unknown>
    extends HttpMethodRequestConfig<TBody> {
    /** API endpoint path */
    endpoint: string;
    /** HTTP method */
    method: HttpMethod;
}

type RequestInterceptorOptions = {
    runWhen?: (config: InternalAxiosRequestConfig) => boolean;
    synchronous?: boolean;
};

/**
 * Infer response data type from Axios `responseType` when `TResponse` is not provided.
 * Explicit `TResponse` always wins.
 */
type ResponseDataByType<R extends ResponseType | undefined> = R extends "text"
    ? string
    : R extends "blob"
      ? Blob
      : R extends "arraybuffer"
        ? ArrayBuffer
        : R extends "document"
          ? Document
          : R extends "stream"
            ? unknown
            : unknown;

type InferResponseData<
    TResponse,
    TConfig extends HttpMethodRequestConfig | undefined,
> = unknown extends TResponse
    ? TConfig extends { responseType: infer R }
        ? R extends ResponseType
            ? ResponseDataByType<R>
            : TResponse
        : TResponse
    : TResponse;

type LegacyRequestConfig<TBody = unknown> = HttpMethodRequestConfig<TBody> & {
    errorMode?: "legacy";
};

type ModernRequestConfig<TBody = unknown> = HttpMethodRequestConfig<TBody> & {
    errorMode: "modern";
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
        rejected?: (error: unknown) => never
    ): () => void {
        const id = this.#axios.interceptors.response.use(fulfilled, rejected);
        return () => this.#axios.interceptors.response.eject(id);
    }

    /**
     * Makes a POST request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    post<
        TResponse = unknown,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
        TConfig extends LegacyRequestConfig<TBody> = LegacyRequestConfig<TBody>,
    >(
        endpoint: string,
        body: TBody,
        config?: TConfig
    ): Promise<
        TryCatchHttpReturnType<InferResponseData<TResponse, TConfig>, TError>
    >;

    post<
        TResponse = unknown,
        TBody = unknown,
        TErrorData = unknown,
        TConfig extends ModernRequestConfig<TBody> = ModernRequestConfig<TBody>,
    >(
        endpoint: string,
        body: TBody,
        config: TConfig
    ): Promise<
        TryCatchHttpReturnType<
            InferResponseData<TResponse, TConfig>,
            ModernHttpError<TErrorData>
        >
    >;

    post<TResponse = unknown, TBody = unknown>(
        endpoint: string,
        body: TBody,
        config?: HttpMethodRequestConfig<TBody>
    ) {
        return this.#request<TResponse, TBody>({
            data: body,
            endpoint,
            ...config,
            method: "POST",
        });
    }

    /**
     * Makes a DELETE request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    delete<
        TResponse = unknown,
        TError extends ErrorType = ErrorType,
        TConfig extends LegacyRequestConfig = LegacyRequestConfig,
    >(
        endpoint: string,
        config?: TConfig
    ): Promise<
        TryCatchHttpReturnType<InferResponseData<TResponse, TConfig>, TError>
    >;

    delete<
        TResponse = unknown,
        TErrorData = unknown,
        TConfig extends ModernRequestConfig = ModernRequestConfig,
    >(
        endpoint: string,
        config: TConfig
    ): Promise<
        TryCatchHttpReturnType<
            InferResponseData<TResponse, TConfig>,
            ModernHttpError<TErrorData>
        >
    >;

    delete<TResponse = unknown>(
        endpoint: string,
        config?: HttpMethodRequestConfig
    ) {
        return this.#request<TResponse>({
            endpoint,
            method: "DELETE",
            ...config,
        });
    }

    /**
     * Makes a PUT request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    put<
        TResponse = unknown,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
        TConfig extends LegacyRequestConfig<TBody> = LegacyRequestConfig<TBody>,
    >(
        endpoint: string,
        body: TBody,
        config?: TConfig
    ): Promise<
        TryCatchHttpReturnType<InferResponseData<TResponse, TConfig>, TError>
    >;

    put<
        TResponse = unknown,
        TBody = unknown,
        TErrorData = unknown,
        TConfig extends ModernRequestConfig<TBody> = ModernRequestConfig<TBody>,
    >(
        endpoint: string,
        body: TBody,
        config: TConfig
    ): Promise<
        TryCatchHttpReturnType<
            InferResponseData<TResponse, TConfig>,
            ModernHttpError<TErrorData>
        >
    >;

    put<TResponse = unknown, TBody = unknown>(
        endpoint: string,
        body: TBody,
        config?: HttpMethodRequestConfig<TBody>
    ) {
        return this.#request<TResponse, TBody>({
            data: body,
            endpoint,
            method: "PUT",
            ...config,
        });
    }

    /**
     * Makes a PATCH request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    patch<
        TResponse = unknown,
        TBody = unknown,
        TError extends ErrorType = ErrorType,
        TConfig extends LegacyRequestConfig<TBody> = LegacyRequestConfig<TBody>,
    >(
        endpoint: string,
        body: TBody,
        config?: TConfig
    ): Promise<
        TryCatchHttpReturnType<InferResponseData<TResponse, TConfig>, TError>
    >;

    patch<
        TResponse = unknown,
        TBody = unknown,
        TErrorData = unknown,
        TConfig extends ModernRequestConfig<TBody> = ModernRequestConfig<TBody>,
    >(
        endpoint: string,
        body: TBody,
        config: TConfig
    ): Promise<
        TryCatchHttpReturnType<
            InferResponseData<TResponse, TConfig>,
            ModernHttpError<TErrorData>
        >
    >;

    patch<TResponse = unknown, TBody = unknown>(
        endpoint: string,
        body: TBody,
        config?: HttpMethodRequestConfig<TBody>
    ) {
        return this.#request<TResponse, TBody>({
            data: body,
            endpoint,
            method: "PATCH",
            ...config,
        });
    }

    /**
     * Makes a GET request to the specified endpoint
     * @returns Tuple of [error, response]
     */
    get<
        TResponse = unknown,
        TError extends ErrorType = ErrorType,
        TConfig extends LegacyRequestConfig = LegacyRequestConfig,
    >(
        endpoint: string,
        config?: TConfig
    ): Promise<
        TryCatchHttpReturnType<InferResponseData<TResponse, TConfig>, TError>
    >;

    get<
        TResponse = unknown,
        TErrorData = unknown,
        TConfig extends ModernRequestConfig = ModernRequestConfig,
    >(
        endpoint: string,
        config: TConfig
    ): Promise<
        TryCatchHttpReturnType<
            InferResponseData<TResponse, TConfig>,
            ModernHttpError<TErrorData>
        >
    >;

    get<TResponse = unknown>(
        endpoint: string,
        config?: HttpMethodRequestConfig
    ) {
        return this.#request<TResponse>({
            ...config,
            endpoint,
            method: "GET",
        });
    }

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
        errorMode: _errorMode,
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
    async #request<TResponse, TBody = unknown>(
        requestConfig: RequestConfig<TBody>
    ) {
        const errorMode = requestConfig.errorMode ?? "legacy";
        const config = this.#mergeConfig<TBody>(requestConfig);

        if (errorMode === "modern") {
            return tryCatchHttp<TResponse, unknown>(async () => {
                this.#logRequest(config);
                const response: AxiosResponse<TResponse> =
                    await this.#axios.request<TResponse>(config);
                return response.data;
            }, { errorMode: "modern" })();
        }

        return tryCatchHttp<TResponse, ErrorType>(async () => {
            this.#logRequest(config);
            const response: AxiosResponse<TResponse> =
                await this.#axios.request<TResponse>(config);
            return response.data;
        }, { errorMode: "legacy" })();
    }
}
