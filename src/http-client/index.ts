/**
 * HTTP client utilities for making API requests and handling errors
 * @module http-client
 */

export {
    HttpClient,
    type BaseUrl,
    type Endpoint,
    type HttpMethodRequestConfig,
    type HttpRequestConfig,
} from "./httpclient";
export * from "./status-code";
export {
    tryCatchHttp,
    type ErrorMode,
    type ErrorType,
    type ModernHttpError,
    type TryCatchHttpReturnType,
} from "./try-catch-http";
