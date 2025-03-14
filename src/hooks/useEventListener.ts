import { useEffect } from "react";

interface EventListenerOptions extends AddEventListenerOptions {
    disabled?: boolean;
}
/**
 * Registers an event listener and removes it when the component unmounts.
 * Uses AbortController for cleanup.
 *
 * @param {string} eventName - The event name to listen for.
 * @param {Function} callback - The callback function to be executed when the event is triggered.
 * @param options
 * @returns {void}
 *
 * @example
 * useEventListener('scroll', handleScroll);
 *
 */
export const useEventListener = (
    eventName: keyof WindowEventMap | string,
    callback: VoidFunction,
    options: EventListenerOptions = {}
): void => {
    const { disabled = false, ...rest } = options;

    useEffect(() => {
        if (disabled) return;

        const abortController = new AbortController();
        const signal = abortController.signal;

        window.addEventListener(eventName, callback, { ...rest, signal });

        return () => {
            abortController.abort();
        };
    }, [eventName, callback, disabled]);
};
