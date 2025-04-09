/**
 * Conditionally returns an array containing provided value(s).
 *
 * @param shouldAdd - Boolean condition to evaluate.
 * @param itemOrItems - Single item or array of items to return if the condition is true.
 * @returns Array containing item(s) if condition is true, otherwise an empty array.
 */
export const conditionallyAddToArray = <T>(shouldAdd: boolean, itemOrItems: T | T[]): T[] => {
    return shouldAdd ? normalizeToArray(itemOrItems) : [];
};

/**
 * Normalizes input to an array.
 *
 * @param input - The input that may or may not be already an array.
 * @returns Array containing the provided input(s).
 */
const normalizeToArray = <T>(input: T | T[]): T[] => {
    return Array.isArray(input) ? input : [input];
};
