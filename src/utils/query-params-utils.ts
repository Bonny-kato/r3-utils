/**
 * Represents a dictionary of serializable query parameters used for constructing query strings or other key-value-based structures.
 *

 * Designed to be compatible with serialization processes where query parameters need to be transformed into string-based formats (e.g., URL query strings).
 */
type SerializableQueryParams = {
    [key: string]: string | number | boolean | undefined | string[] | number[];
};

/**
 * Generates query parameters from an object.
 * Ony params that has a truth value will be included on url else will be discarded
 * @param {SerializableQueryParams} params - The object containing the query parameters.
 * @returns {URLSearchParams} - The generated query parameters.
 */
export const serializeQueryParams = (
    params?: SerializableQueryParams
): string => {
    const urlSearchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
        if (value) {
            if (Array.isArray(value)) {
                value.forEach((item) =>
                    urlSearchParams.append(key, String(item))
                );
            } else {
                urlSearchParams.append(key, String(value));
            }
        }
    }

    return urlSearchParams.toString();
};

export type ParsedSearchParams = Record<
    string,
    string | string[] | undefined | boolean | number
>;

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
    // Extract the query string from the full URL
    const queryString = fullUrl.includes("?") ? fullUrl.split("?")[1] : fullUrl;
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
