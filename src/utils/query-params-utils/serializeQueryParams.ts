/**
 * Represents a dictionary of serializable query parameters used for constructing query strings or other key-value-based structures.
 *
 * Designed to be compatible with serialization processes where query parameters need to be transformed into string-based formats (e.g., URL query strings).
 */
export type SerializableQueryParams = {
    [key: string]: string | number | boolean | undefined | string[] | number[];
};

/**
 * Generates query parameters from an object.
 * Ony params that has a truth value will be included on url else will be discarded
 * @param {SerializableQueryParams} params - The object containing the query parameters.
 * @returns {string} - The generated query parameters string (without leading ?).
 */
export const serializeQueryParams = (
    params?: SerializableQueryParams
): string => {
    const urlSearchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
        if (value != null) {
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
