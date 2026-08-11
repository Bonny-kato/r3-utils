import axios, { AxiosError } from "axios";
import {
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_SERVICE_NOT_AVAILABLE,
    NETWORK_ERROR_CODE,
} from "~/http-client/status-code";
import { checkIsDevMode, tryCatch } from "~/utils";

/**
 * Error shape mode for HTTP failures.
 * - `legacy` (default): backward-compatible ErrorType with root-spread + always-number status
 * - `modern`: discriminated honest error (`kind`, `data` as-is, original via `cause`)
 */
export type ErrorMode = "legacy" | "modern";

/**
 * Standard error type used throughout the application (legacy / default shape).
 * Contains a message and HTTP status code, plus additive diagnostics.
 */
export interface ErrorType<TErrorData = unknown> {
    /** Error message describing what went wrong */
    message: string;
    /** HTTP status code associated with the error (synthetic when no response) */
    status: number;
    /** Response body as returned by Axios (`response.data`), when available */
    data?: TErrorData;
    /** Original caught error (typically AxiosError) */
    cause?: unknown;
    /** Axios / transport error code when available (e.g. ERR_NETWORK, ECONNABORTED) */
    code?: string;
}

/**
 * Modern, discriminated HTTP error shape (opt-in via `errorMode: "modern"`).
 */
export type ModernHttpError<TErrorData = unknown> =
    | {
          kind: "http";
          message: string;
          status: number;
          data: TErrorData;
          code?: string;
          cause: unknown;
      }
    | {
          kind: "network" | "timeout" | "canceled" | "unknown";
          message: string;
          code?: string;
          cause: unknown;
      };

/**
 * Represents a successful operation result in a try-catch pattern.
 * First element is null (no error), second element is the result data.
 */
type SuccessType<T> = [null, T];

/**
 * Represents a failed operation result in a try-catch pattern.
 * First element is the error information, second element is null (no data).
 */
type FailureType<TError> = [TError, null];

/**
 * Return type for functions wrapped with tryCatch.
 * Either contains a successful result or error information.
 */
export type TryCatchHttpReturnType<TData, TError = ErrorType> =
    | SuccessType<TData>
    | FailureType<TError>;

const defaultErrorObj = {
    message: "Unknown error",
    status: HTTP_INTERNAL_SERVER_ERROR,
};

const FRIENDLY_NETWORK_MESSAGE =
    "Unable to connect to the server. Please check your internet connection and try again.";

const isBrowserOffline = () =>
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !window.navigator.onLine;

const isAxiosNetworkError = (err: AxiosError) => {
    if (isBrowserOffline()) return true;
    if (err.request && !err.response) return true;
    const code = (err.code || "").toUpperCase();
    return Boolean(code && NETWORK_ERROR_CODE.includes(code));
};

const isTimeoutError = (err: AxiosError) => {
    const code = (err.code || "").toUpperCase();
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
        return true;
    }
    return (
        typeof err.message === "string" &&
        err.message.toLowerCase().includes("timeout")
    );
};

const isCanceledError = (err: AxiosError) => {
    const code = (err.code || "").toUpperCase();
    return (
        axios.isCancel(err) ||
        code === "ERR_CANCELED" ||
        err.name === "CanceledError" ||
        err.name === "AbortError"
    );
};

const getObjectMessage = (value: unknown): string | undefined => {
    if (
        typeof value === "object" &&
        value !== null &&
        "message" in value &&
        typeof (value as { message: unknown }).message === "string"
    ) {
        return (value as { message: string }).message;
    }
    return undefined;
};

/**
 * Builds the modern discriminated error model from any thrown value.
 */
const toModernHttpError = <TErrorData = unknown>(
    error: unknown
): ModernHttpError<TErrorData> => {
    if (axios.isAxiosError(error)) {
        if (error.response) {
            const data = error.response.data as TErrorData;
            return {
                cause: error,
                code: error.code,
                data,
                kind: "http",
                message:
                    getObjectMessage(error.response.data) ||
                    error.message ||
                    defaultErrorObj.message,
                status:
                    Number(error.response.status) || HTTP_INTERNAL_SERVER_ERROR,
            };
        }

        if (isCanceledError(error)) {
            return {
                cause: error,
                code: error.code,
                kind: "canceled",
                message: error.message || "Request canceled",
            };
        }

        if (isTimeoutError(error)) {
            return {
                cause: error,
                code: error.code,
                kind: "timeout",
                // Preserve legacy-friendly copy when this would have been treated as a network-class failure
                message: isAxiosNetworkError(error)
                    ? FRIENDLY_NETWORK_MESSAGE
                    : error.message || FRIENDLY_NETWORK_MESSAGE,
            };
        }

        if (isAxiosNetworkError(error)) {
            return {
                cause: error,
                code: error.code,
                kind: "network",
                message: FRIENDLY_NETWORK_MESSAGE,
            };
        }

        const code = (error.code || "").toUpperCase();
        if (code === "ERR_NETWORK" || error.message === "Network Error") {
            return {
                cause: error,
                code: error.code,
                kind: "network",
                message: error.message || FRIENDLY_NETWORK_MESSAGE,
            };
        }

        return {
            cause: error,
            code: error.code,
            kind: "unknown",
            message: error.message || defaultErrorObj.message,
        };
    }

    if (error instanceof Error) {
        return {
            cause: error,
            kind: "unknown",
            message: error.message,
        };
    }

    return {
        cause: error,
        kind: "unknown",
        message: defaultErrorObj.message,
    };
};

/**
 * Projects any thrown value into the legacy-compatible ErrorType shape.
 * Keeps historical behavior (root-spread body, always-number status, friendly network copy)
 * and adds `data` / `cause` / `code` without removing old fields.
 */
const toLegacyError = <TError extends ErrorType>(error: unknown): TError => {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

        if (isAxiosNetworkError(error)) {
            return {
                cause: error,
                code: error.code,
                message: FRIENDLY_NETWORK_MESSAGE,
                status: HTTP_SERVICE_NOT_AVAILABLE,
            } as TError;
        }

        const errorData = responseData as ErrorType | undefined;

        return {
            // Preserve historical root-spread of response body
            ...error.response?.data,
            cause: error,
            code: error.code,
            data: responseData,
            message:
                errorData?.message || error.message || defaultErrorObj.message,
            status:
                Number(error.response?.status) || HTTP_INTERNAL_SERVER_ERROR,
        } as TError;
    }

    if (error instanceof Error) {
        return {
            ...defaultErrorObj,
            cause: error,
            message: error.message,
        } as TError;
    }

    return {
        ...defaultErrorObj,
        cause: error,
    } as TError;
};

/**
 * Extracts standardized error information from various error types.
 *
 * @param error - The caught error of any type
 * @param errorMode - legacy (default) or modern error shape
 * @returns A promise resolving to standardized error information
 */
const extractErrorInfo = async <TError>(
    error: unknown,
    errorMode: ErrorMode = "legacy"
): Promise<TError> => {
    if (checkIsDevMode()) {
        console.error("[API Error]:", error);
    }

    if (errorMode === "modern") {
        return toModernHttpError(error) as TError;
    }

    return toLegacyError(error) as TError;
};

/**
 * Type definition for an async function that can be wrapped with tryCatch.
 */
type AsyncFunc<Args extends unknown[], TData> = (
    ...args: Args
) => Promise<TData>;

type TryCatchHttpOptions = {
    errorMode?: ErrorMode;
};

/**
 * Higher-order function that wraps an async function with try-catch error handling.
 *
 * Instead of throwing exceptions, the wrapped function returns a tuple where:
 * - On success: [null, result]
 * - On failure: [errorInfo, null]
 *
 * This allows for more predictable error handling without try-catch blocks at call sites.
 *
 * @param asyncFunc - The async function to wrap
 * @param options - Optional error mode (`legacy` default, or `modern`)
 * @returns A new function that returns a tuple of [error, result]
 *
 * @example
 * ```typescript
 * const safeGetUser = tryCatchHttp(async (id: string) => {
 *   return await api.getUser(id);
 * });
 *
 * const [error, user] = await safeGetUser('123');
 * if (error) {
 *   // Handle error
 * } else {
 *   // Use user data
 * }
 * ```
 */
export function tryCatchHttp<
    TData,
    TError extends ErrorType = ErrorType,
    Args extends unknown[] = [],
>(
    asyncFunc: AsyncFunc<Args, TData>,
    options?: TryCatchHttpOptions & { errorMode?: "legacy" }
): (...args: Args) => Promise<TryCatchHttpReturnType<TData, TError>>;

export function tryCatchHttp<
    TData,
    TErrorData = unknown,
    Args extends unknown[] = [],
>(
    asyncFunc: AsyncFunc<Args, TData>,
    options: TryCatchHttpOptions & { errorMode: "modern" }
): (
    ...args: Args
) => Promise<TryCatchHttpReturnType<TData, ModernHttpError<TErrorData>>>;

export function tryCatchHttp<
    TData,
    TError = ErrorType,
    Args extends unknown[] = [],
>(
    asyncFunc: AsyncFunc<Args, TData>,
    options: TryCatchHttpOptions = {}
): (...args: Args) => Promise<TryCatchHttpReturnType<TData, TError>> {
    const errorMode = options.errorMode ?? "legacy";

    return async (
        ...args: Args
    ): Promise<TryCatchHttpReturnType<TData, TError>> => {
        const [error, response] = await tryCatch<TData>(asyncFunc(...args));

        if (error) {
            const errorInfo = await extractErrorInfo<TError>(error, errorMode);
            return [errorInfo, null] as FailureType<TError>;
        }
        return [null, response] as SuccessType<TData>;
    };
}
