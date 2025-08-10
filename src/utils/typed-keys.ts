/**
 * Returns an array of typed string keys from an object.
 *
 * This utility function takes an object and returns its keys as an array,
 * with proper TypeScript typing that preserves the key types.
 *
 * @template T - The object type to extract keys from
 * @param obj - The source object
 * @returns An array containing the string keys of the object with correct typing
 *
 * @example
 * ```typescript
 * const obj = { foo: 1, bar: 'baz' };
 * const keys = typedKeys(obj); // ['foo', 'bar'] with type Array<'foo' | 'bar'>
 * ```
 */
export const typedKeys = <T extends object>(
    obj: T
): Array<Extract<keyof T, string>> =>
    Object.keys(obj) as Array<Extract<keyof T, string>>;
