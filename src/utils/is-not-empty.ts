type Value = string | Array<never> | object | null | undefined | number;

/**
 * Checks if value is not empty
 * @param value
 */
export const isNotEmpty = <T extends Value>(
    value: T | undefined
): value is T => {
    if (value == undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
};
