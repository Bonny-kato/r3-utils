import { AxiosError } from "axios";
import { HTTP_INTERNAL_SERVER_ERROR } from "../constants";
import { checkIsDevMode, tryCatch } from "../utils";

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
type FailureType<TError extends ErrorType> = [TError, null];

/**
 * Return type for functions wrapped with tryCatch.
 * Either contains a successful result or error information.
 */
export type TryCatchHttpReturnType<TData, TError extends ErrorType> =
    | SuccessType<TData>
    | FailureType<TError>;

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

const defaultErrorObj = {
    message: "Unknown error",
    status: HTTP_INTERNAL_SERVER_ERROR,
};

/**
 * Extracts standardized error information from various error types.
 *
 * @param error - The caught error of any type
 * @returns A promise resolving to standardized error information
 */
const extractErrorInfo = async <TError extends ErrorType>(
    error: unknown
): Promise<TError> => {
    if (checkIsDevMode()) {
        console.error("[API Error]:", error);
    }

    if (error instanceof AxiosError) {
        const errorData = error.response?.data as ErrorData | undefined;

        return {
            ...error.response?.data,
            message:
                errorData?.message || error.message || defaultErrorObj.message,
            status:
                Number(error.response?.status) || HTTP_INTERNAL_SERVER_ERROR,
        };
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
        return {
            ...defaultErrorObj,
            message: error.message,
        } as TError;
    }

    return defaultErrorObj as TError;
};

/**
 * Type definition for an async function that can be wrapped with tryCatch.
 */
type AsyncFunc<Args extends unknown[], TData> = (
    ...args: Args
) => Promise<TData>;

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
export const tryCatchHttp = <
    TData,
    TError extends ErrorType = ErrorType,
    Args extends unknown[] = [],
>(
    asyncFunc: AsyncFunc<Args, TData>
): ((...args: Args) => Promise<TryCatchHttpReturnType<TData, TError>>) => {
    return async (
        ...args: Args
    ): Promise<TryCatchHttpReturnType<TData, TError>> => {
        const [error, response] = await tryCatch<TData>(asyncFunc(...args));

        if (error) {
            const errorInfo = await extractErrorInfo(error);
            return [errorInfo, null] as FailureType<TError>;
        }
        return [null, response] as SuccessType<TData>;
    };
};
