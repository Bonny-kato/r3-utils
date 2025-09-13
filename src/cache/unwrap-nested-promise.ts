/**
 * A utility type that unwraps all promises in a nested object structure.
 *
 * @template T - The type to unwrap
 * @returns If T is an object, returns an object with the same keys but with all values unwrapped.
 *          If T is not an object, returns the awaited value of T.
 *
 * @example
 * // For a simple promise
 * type Result = UnwrapNestedPromise<Promise<number>>; // number
 *
 * // For an object with promises
 * type ComplexObj = {
 *   a: Promise<number>,
 *   b: string,
 *   c: Promise<boolean>
 * };
 * type Result = UnwrapNestedPromise<ComplexObj>; // { a: number, b: string, c: boolean }
 */
export type UnwrapNestedPromise<T> = T extends object
    ? { [K in keyof T]: Awaited<T[K]> }
    : Awaited<T>;

/**
 * The return type of the unwrapNestedPromise function.
 *
 * @template T - The type of the input data
 * @returns A promise that resolves to an object containing either the unwrapped data or an error.
 */
type UnwrapNestedPromiseReturn<T> = Promise<{
    /** The unwrapped data, or undefined if an error occurred */
    data: UnwrapNestedPromise<T> | undefined;
    /** Any error that occurred during unwrapping, or null if successful */
    error: unknown | null;
}>;

/**
 * Unwraps all promises in a nested object structure.
 *
 * This function takes an object that may contain promises as property values,
 * and returns a new object with the same structure but with all promises resolved.
 * If the input is not an object, it simply returns the input value.
 *
 * @template T - The type of the input data
 * @param {UnwrapNestedPromise<T>} data - The data to unwrap
 * @returns {UnwrapNestedPromiseReturn<T>} A promise that resolves to an object containing either the unwrapped data or an error
 *
 * @example
 * // For a simple object with promises
 * const input = {
 *   a: Promise.resolve(1),
 *   b: "hello",
 *   c: Promise.resolve(true)
 * };
 * const { data, error } = await unwrapNestedPromise(input);
 * // data = { a: 1, b: "hello", c: true }
 * // error = null
 *
 * @example
 * // Error handling
 * try {
 *   const input = {
 *     a: Promise.reject(new Error("Something went wrong"))
 *   };
 *   const { data, error } = await unwrapNestedPromise(input);
 *   // data = undefined
 *   // error = Error("Something went wrong")
 * } catch (e) {
 *   // This won't be reached as errors are caught internally
 * }
 */
export const unwrapNestedPromise = async <T>(
    data: UnwrapNestedPromise<T>
): UnwrapNestedPromiseReturn<T> => {
    try {
        if (typeof data === "object" && data !== null) {
            const keys = Object.keys(data);
            const values = Object.values(data);

            const resolvedValues = await Promise.all(
                values.map((value) =>
                    value instanceof Promise ? value : Promise.resolve(value)
                )
            );

            const resolvedObject: UnwrapNestedPromise<T> =
                {} as UnwrapNestedPromise<T>;

            keys.forEach((key, index) => {
                resolvedObject[key as keyof T] = resolvedValues[index];
            });

            return { data: resolvedObject, error: null };
        }

        return { data, error: null };
    } catch (error) {
        console.log("[error]", error);
        return { data: undefined, error };
    }
};
