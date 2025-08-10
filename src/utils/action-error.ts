import { dataWithError } from "remix-toast";
import { ActionErrorType } from "../access-control/type";
import { ErrorType } from "../http-client/try-catch-http";

/**
 * Creates a standardized error response for actions with associated payload data.
 *
 * @template TPayload - Type of the payload data associated with the error
 * @template TError - Type extending ErrorType containing error details
 * @param payload - The payload data to include with the error
 * @param error - The error object containing message and status
 * @returns A formatted error response containing the error and payload
 */
export const actionError = <
    TPayload = unknown,
    TError extends ErrorType = ErrorType,
>(
    payload: TPayload,
    error: TError
) => {
    return dataWithError<ActionErrorType<TPayload, TError>>(
        [error, payload],
        error.message,
        { status: error.status }
    );
};
