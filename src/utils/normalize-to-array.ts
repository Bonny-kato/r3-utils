/**
 * Converts a value into an array.
 *
 * @typeParam T - The type of the elements in the array.
 * @param v - The value to be converted. It can be of type `T`, `T[]`, `undefined`, or `null`.
 * @returns An array containing the input value or an empty array if the input is `null` or `undefined`.
 */
export const normalizeToArray = <T>(v: T | T[] | undefined | null): T[] => {
    return v == null ? [] : Array.isArray(v) ? v : [v];
};
