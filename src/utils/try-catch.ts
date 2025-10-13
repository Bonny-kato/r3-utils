type TryCatchSuccess<TResult> = [null, TResult];
type TryCatchError<TError> = [TError, null];

export type TryCatchResult<TResult, TError = Error> =
    | TryCatchSuccess<TResult>
    | TryCatchError<TError>;

/**
 * A utility function that wraps both sync and async operations to handle errors in a type-safe way.
 * It returns either a tuple [error, null] | [null, data] or a Promise resolving to that tuple
 * depending on whether the input is synchronous or asynchronous.
 *
 * @template TResult - The type of successful data returned by the input
 * @template TError - The type of error (defaults to Error)
 */
export function tryCatch<TResult, TError = Error>(
    input: () => Promise<TResult>
): Promise<TryCatchResult<TResult, TError>>;

export function tryCatch<TResult, TError = Error>(
    input: Promise<TResult>
): Promise<TryCatchResult<TResult, TError>>;

export function tryCatch<TResult, TError = Error>(
    input: () => TResult
): TryCatchResult<TResult, TError>;

export function tryCatch<TResult, TError = Error>(
    input: TResult
): TryCatchResult<TResult, TError>;

export function tryCatch<TResult, TError = Error>(
    input:
        | Promise<TResult>
        | (() => Promise<TResult>)
        | (() => TResult)
        | TResult
): TryCatchResult<TResult, TError> | Promise<TryCatchResult<TResult, TError>> {
    const isPromise =
        input instanceof Promise ||
        (typeof input === "function" &&
            input.constructor.name === "AsyncFunction");

    if (isPromise) {
        return (async () => {
            try {
                const result =
                    typeof input === "function"
                        ? await (input as () => Promise<TResult>)()
                        : await input;
                return [null, result] as [null, TResult];
            } catch (error) {
                return [error as TError, null] as [TError, null];
            }
        })();
    }

    try {
        const result =
            typeof input === "function" ? (input as () => TResult)() : input;
        return [null, result] as [null, TResult];
    } catch (error) {
        return [error as TError, null] as [TError, null];
    }
}
