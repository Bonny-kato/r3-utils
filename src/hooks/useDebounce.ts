import { useRef } from "react";

type Callback<T> = (value: T) => void;
const DEFAULT_DEBOUNCE_TIMEOUT = 300;

type DebouncedHandler<T> = (value: T) => void;

/**
 * Custom hook that returns a debounced function that delays the execution of the provided callback.
 *
 * @function
 * @param {Function} callback - The function to be executed after the debounce time.
 * @param {number} [debounce=DEFAULT_DEBOUNCE_TIMEOUT] - The debounce delay time in milliseconds.
 * @returns {DebouncedHandler} - A debounced version of the provided callback function.
 * 
 * @example
 * // In a search component
 * const handleSearch = (query) => {
 *   // Perform search operation with query
 *   fetchSearchResults(query);
 * };
 * 
 * // Create a debounced version of the search handler
 * const debouncedSearch = useDebounce(handleSearch, 500);
 * 
 * // In an input onChange handler
 * const onChange = (e) => {
 *   const query = e.target.value;
 *   debouncedSearch(query); // Will only execute after 500ms of inactivity
 * };
 */
export const useDebounce = <T>(callback: Callback<T>, debounce?: number): DebouncedHandler<T> => {
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    return (value: T) => {
        if (timeoutRef.current) {
            clearInterval(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(value);
        }, debounce ?? DEFAULT_DEBOUNCE_TIMEOUT);
    };
};
