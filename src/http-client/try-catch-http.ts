import { AxiosError } from "axios";
import { checkIsDevMode } from "../utils";

/**
 * Standard error type used throughout the application.
 * Contains a message and HTTP status code.
 */
export interface ErrorType {
    /** Error message describing what went wrong */
    message: string;
    /** HTTP status code associated with the error */
    status: number;
}

/**
 * Represents a successful operation result in a try-catch pattern.
 * First element is null (no error), second element is the result data.
 */
type SuccessType<T> = [null, T];

/**
 * Represents a failed operation result in a try-catch pattern.
 * First element is the error information, second element is null (no data).
 */
type FailureType = [ErrorType, null];

/**
 * Return type for functions wrapped with tryCatch.
 * Either contains a successful result or error information.
 */
export type TryCatchHttpReturnType<T> = SuccessType<T> | FailureType;

/**
 * Structure of error data typically returned from API responses.
 */
interface ErrorData {
    /** The root cause of the error */
    cause: string;
    /** Error message */
    message: string;
    /** Optional detailed description of the error */
    description?: string;
}

/**
 * Extracts standardized error information from various error types.
 *
 * @param error - The caught error of any type
 * @returns A promise resolving to standardized error information
 */
const extractErrorInfo = async (error: unknown): Promise<ErrorType> => {
    // Log errors in development mode only
    if (checkIsDevMode()) {
        // Using console.error is more appropriate for errors
        console.error("[API Error]:", error);
    }

    // Handle Axios errors (network or API errors)
    if (error instanceof AxiosError) {
        const errorData = error.response?.data as ErrorData | undefined;

        return {
            message: errorData?.message || error.message || "Unknown API error",
            status: Number(error.response?.status) || 500,
        };
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
        return {
            message: error.message || "Unknown error",
            status: 500,
        };
    }

    // Handle non-Error objects or primitives
    return {
        message: String(error) || "Unknown error",
        status: 500,
    };
};

/**
 * Type definition for an async function that can be wrapped with tryCatch.
 */
type AsyncFunc<Args extends unknown[], TData> = (...args: Args) => Promise<TData>;

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
 * @returns A new function that returns a tuple of [error, result]
 *
 * @example
 * ```typescript
 * const safeGetUser = tryCatch(async (id: string) => {
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
export const tryCatchHttp = <Args extends unknown[], TData>(
    asyncFunc: AsyncFunc<Args, TData>
): ((...args: Args) => Promise<TryCatchHttpReturnType<TData>>) => {
    return async (...args: Args): Promise<TryCatchHttpReturnType<TData>> => {
        try {
            const result = await asyncFunc(...args);
            return [null, result] as SuccessType<TData>;
        } catch (error) {
            const errorInfo = await extractErrorInfo(error);
            return [errorInfo, null] as FailureType;
        }
    };
};
