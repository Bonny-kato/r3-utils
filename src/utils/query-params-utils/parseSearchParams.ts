export type ParsedSearchParams = Record<string, string | string[] | undefined>;

/**
 * Extracts the query string parameters from a given URL and returns them as an object.
 *
 * @param {string} fullUrl - The full URL from which to extract the query string parameters.
 * @returns {T} - The parsed query string parameters as an object.
 * @template T - Specifies the type of the returned parsed query string parameters object.
 *
 * @example
 * // Extract query string parameters from the given URL
 * const parsedParams = parseSearchParams("https://example.com/page?param1=value1&param2=value2");
 *
 * @example
 * // Extract query string parameters from the given URL and specify the return type
 * const parsedParams = parseSearchParams<MyParsedParamsType>("https://example.com/page?param1=value1&param2=value2");
 */
export const parseSearchParams = <
    T extends ParsedSearchParams = ParsedSearchParams,
>(
    fullUrl: string
): T => {
    // Determine the query string from the provided input
    // - If a full URL is provided, use URL API to get the search part
    // - If a raw query string is provided, use it as-is
    let queryString = "";

    try {
        const url = new URL(fullUrl);
        queryString = url.search.startsWith("?")
            ? url.search.slice(1)
            : url.search;
    } catch {
        // Not a full URL, treat input as a raw query string
        queryString = fullUrl.startsWith("?") ? fullUrl.slice(1) : fullUrl;
    }

    // If there's no query string, return an empty object
    if (!queryString) {
        return {} as T;
    }

    const params = new URLSearchParams(queryString);
    const parsedParams: ParsedSearchParams = {};

    params.forEach((value, key) => {
        if (key in parsedParams) {
            if (Array.isArray(parsedParams[key])) {
                (parsedParams[key] as string[]).push(value);
            } else {
                parsedParams[key] = [parsedParams[key] as string, value];
            }
        } else {
            parsedParams[key] = value;
        }
    });

    return parsedParams as T;
};
