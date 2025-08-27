type TryCatchSuccess<TResult> = [null, TResult];
type TryCatchError<TError> = [TError, null];

export type TryCatchResult<TResult, TError = Error> =
    | TryCatchSuccess<TResult>
    | TryCatchError<TError>;

/**
 * A utility function that wraps async operations to handle errors in a type-safe way.
 * It returns a tuple with either [error, null] or [null, data] to enable proper type narrowing.
 *
 * @template T - The type of successful data returned by the input
 * @template E - The type of error (defaults to Error)
 * @param input - The input to be executed
 * @returns A input resolving to a tuple of [error, null] or [null, data]
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
export const tryCatch = async <TResult, TError = Error>(
    input: Promise<TResult> | (() => Promise<TResult>)
): Promise<TryCatchResult<TResult, TError>> => {
    try {
        const data = await (typeof input === "function" ? input() : input);
        return [null, data] as [null, TResult];
    } catch (error) {
        return [error as TError, null] as [TError, null];
    }
};
