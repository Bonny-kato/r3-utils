/**
 * A utility type for extracting nullable variants (null or undefined) from a given type `T`.
 *
 * @typeParam T - The type from which nullable variants will be extracted.
 */
export type Nullable<T> = Extract<T, null | undefined>;

type Value = string | Array<never> | object | null | undefined | number;

/**
 * A type guard function that checks if a given value is not empty.
 *
 * This function determines the emptiness of a value based on its type:
 * - For `undefined` or `null`, it returns `false`.
 * - For `number`, it always returns `true` (since numbers cannot be "empty").
 * - For `string`, it checks if the string is non-empty after trimming.
 * - For `Array`, it checks if the array has at least one element.
 * - For `Object`, it checks if the object has at least one own property.
 *
 * @typeParam T - The type of the value being checked.
 * @param value - The value to check for emptiness.
 * @returns A boolean indicating whether the value is not empty. If true, the value is asserted to be `NonNullable<T>`.
 *
 * @example
 * ```ts
 * const result1 = isNotEmpty(""); // false
 * const result2 = isNotEmpty("Hello"); // true
 * const result3 = isNotEmpty([1, 2, 3]); // true
 * const result4 = isNotEmpty([]); // false
 * const result5 = isNotEmpty({ key: "value" }); // true
 * const result6 = isNotEmpty({}); // false
 * const result7 = isNotEmpty(0); // true
 * const result8 = isNotEmpty(null); // false
 * const result9 = isNotEmpty(undefined); // false
 * ```
 */
export const isNotEmpty = <T extends Value>(
    value: T
): value is NonNullable<T> => {
    if (value == undefined) return false;
    if (typeof value === "number") return true;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Error) return true;
    return Object.keys(value).length > 0;
};

/**
 * Checks if the given value is considered empty.
 *
 * @remarks
 * A value is considered empty if it is `null`, `undefined`, or if it doesn't pass the `isNotEmpty` check.
 * This utility function is generic and accepts any type that extends the `Value` type.
 *
 * @typeParam T - The type of the value being checked. Must extend the `Value` type.
 * @param value - The value to be checked for emptiness.
 * @returns A boolean indicating if the value is considered empty. Returns true if empty, otherwise false.
 *
 * @example
 * ```ts
 * const myValue: string | null = null;
 * if (isEmpty(myValue)) {
 *   console.log("The value is empty");
 * }
 * ```
 */
export const isEmpty = <T extends Value>(value: T): value is Nullable<T> => {
    return !isNotEmpty(value);
};
