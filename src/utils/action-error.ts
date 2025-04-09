import { dataWithError } from "remix-toast";
import { ActionErrorType } from "../access-control/type";
import { ErrorType } from "../http-client/try-catch-http";

/**
 * A function to create and return an object containing error information
 * along with optional data. The returned object adheres to the `ActionErrorType`
 * format, encapsulating error details such as an error message and status.
 *
 * @template T - The type of the optional data associated with the error.
 * @param {ErrorType} error - The error object containing the error details, such as message and status.
 * @param {T} [data] - Optional additional data associated with the error.
 * @returns An object containing the error information and optional data.
 */
export const actionError = <T = unknown>(error: ErrorType, data?: T) => {
    return dataWithError<ActionErrorType<T>>(
        {
            data,
            errorMessage: error.message,
        },
        error.message,
        { status: error.status }
    );
};
