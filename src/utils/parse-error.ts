import { ErrorResponse, isRouteErrorResponse } from "react-router";
import { z } from "zod";

/**
 * Zod schema for validating error response objects.
 * Ensures the error object has the required properties of an ErrorResponse.
 */
const errorResponseSchema = z.object({
    status: z.number(),
    data: z.any(),
    statusText: z.string(),
});

/**
 * Non-standard error code used for default error responses.
 * This code (782) is used when an error cannot be properly categorized
 * as a standard HTTP status code.
 */
const NON_STANDARD_ERROR_CODE = 782;

/**
 * Default error response used when an error cannot be parsed into a proper ErrorResponse.
 */
const defaultErrorResponse: ErrorResponse = {
    status: NON_STANDARD_ERROR_CODE,
    data: { message: "Unexpected Error has occurred" },
    statusText: "Unexpected Error has occurred",
};

/**
 * Type guard to check if an object has a string message property.
 *
 * @param obj - The object to check
 * @returns True if the object has a string message property
 */
const hasStringMessage = (obj: unknown): obj is { message: string } => {
    return (
        Boolean(obj) &&
        typeof obj === "object" &&
        obj !== null &&
        "message" in obj &&
        typeof obj?.message === "string"
    );
};

/**
 * Attempts to parse a string as a JSON error response.
 *
 * @param message - The string to parse
 * @returns The parsed error object if successful, null otherwise
 */
const tryParseErrorJson = (message: string): unknown | null => {
    try {
        return JSON.parse(message);
    } catch {
        return null;
    }
};

/**
 * Parses an unknown error into a structured ErrorResponse object.
 *
 * This function handles different error formats:
 * 1. React Router error responses (returned as-is)
 * 2. Objects with a message property containing JSON that can be parsed into an ErrorResponse
 * 3. Other errors (converted to a default error response)
 *
 * @param _error - The error to parse
 * @returns A structured ErrorResponse object
 */
export const parseErrorResponse = (_error: unknown): ErrorResponse => {
    console.log("[_error]", _error);
    // Handle React Router errors
    if (isRouteErrorResponse(_error)) {
        return _error;
    }

    // Handle errors with string message property that might contain JSON
    if (hasStringMessage(_error)) {
        const errorObject = tryParseErrorJson(_error.message);
        if (errorObject) {
            const result = errorResponseSchema.safeParse(errorObject);
            if (result.success) {
                return result.data as ErrorResponse;
            }
        }
    }

    return defaultErrorResponse;
};

/**
 * Checks if an unknown error is a custom error response.
 *
 * This function determines if an error is either:
 * 1. React Router error response
 * 2. An object with a message property containing valid JSON that matches the error response schema
 *
 * @param _error - The error to check
 * @returns True if the error is a custom error response, false otherwise
 */
export const isCustomErrorResponse = (_error: unknown): boolean => {
    // Handle React Router errors
    if (isRouteErrorResponse(_error)) {
        return true;
    }

    // Handle errors with string message property that might contain JSON
    if (hasStringMessage(_error)) {
        const errorObject = tryParseErrorJson(_error.message);
        if (errorObject) {
            return errorResponseSchema.safeParse(errorObject).success;
        }
    }

    return false;
};

/**
 * Extracts a human-readable error message from an unknown error.
 *
 * This function handles different error formats:
 * 1. String errors (returned as-is)
 * 2. Objects with a message property (the message is extracted)
 * 3. Other errors (a default error message is returned)
 *
 * @param error - The error from which to extract a message
 * @returns A human-readable error message
 */
export const getErrorMessage = (error: unknown): string => {
    // If the error is already a string, return it directly
    if (typeof error === "string") return error;

    // If the error has a string message property, return that message
    if (hasStringMessage(error)) {
        return error.message || "Unexpected error has occurred";
    }

    // Default fallback message
    return "Unexpected error has occurred";
};
