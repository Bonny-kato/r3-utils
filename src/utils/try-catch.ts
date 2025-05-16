/**
 * A utility function that wraps async operations to handle errors in a type-safe way.
 * It returns a tuple with either [error, null] or [null, data] to enable proper type narrowing.
 *
 * @template T - The type of successful data returned by the promise
 * @template E - The type of error (defaults to Error)
 * @param promise - The promise to be executed
 * @returns A promise resolving to a tuple of [error, null] or [null, data]
 *
 * @example
 * // Basic usage
 * const [error, data] = await tryCatch(fetchData());
 * if (error) {
 *   // TypeScript knows error is E (not null) here
 *   console.error(error.message);
 *   return;
 * }
 * // TypeScript knows data is T (not null) here
 * console.log(data.someProperty);
 */
export const tryCatch = async <T, E = Error>(
    promise: Promise<T>
): Promise<[E, null] | [null, T]> => {
    try {
        const data = await promise;
        return [null, data] as [null, T];
    } catch (error) {
        return [error as E, null] as [E, null];
    }
};
