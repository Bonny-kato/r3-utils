import { data, ErrorResponse, redirect } from "react-router";
import { ErrorType } from "~/http-client/try-catch-http";

/**
 * Throws a custom error with the provided message and status code.
 *
 * @param message - The custom error message to include in the error response
 * @param statusCode - The HTTP status code to associate with the error
 * @throws A stringified custom error object containing the status, message, and status text
 */
export const throwCustomError = (
    message: string,
    statusCode: number
): never => {
    const error: ErrorResponse = {
        status: statusCode,
        data: { message },
        statusText: message,
    };

    throw new Error(JSON.stringify(error));
};

/**
 * Valid URL types that can be used for redirection.
 * Can be a string, FormDataEntryValue, or null/undefined (which will redirect to home).
 */
type RedirectUrl = FormDataEntryValue | string | null | undefined;

/**
 * Safely redirects the user to the specified URL after validating it.
 *
 * If the URL fails safety checks (not a string, doesn't start with '/', or starts with '//'),
 * the user is redirected to the homepage ('/') instead.
 *
 * @param to - The URL to redirect the user to
 * @param init - Optional parameters for the redirect request
 * @returns The response from the redirect request
 */
export const safeRedirect = (
    to: RedirectUrl,
    init?: number | ResponseInit
): Response => {
    let redirectUrl = to as string;

    if (
        !to ||
        typeof to !== "string" ||
        !to.startsWith("/") ||
        to.startsWith("//")
    ) {
        // Todo: Redirect url should be configurable through a props <fallbackUrl>
        redirectUrl = "/";
    }

    return redirect(redirectUrl, init);
};

/**
 * Throws a JSON-formatted error response.
 *
 * @param error - The error object containing message and status properties
 * @throws A Response object with the error message in JSON format and the specified HTTP status code
 */
export const throwError = (error: ErrorType): never => {
    throw data(error.message, { status: error.status });
};
