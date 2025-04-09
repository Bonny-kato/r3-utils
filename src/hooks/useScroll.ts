import { RefObject, useEffect, useState } from "react";

/**
 * A hook that tracks the scroll position of an element or the window.
 * 
 * @param {RefObject<HTMLElement>} [ref] - Optional reference to an HTML element to track.
 *                                         If not provided, the window's scroll position is tracked.
 * @returns {{ scrollY: number }} An object containing the current vertical scroll position.
 * 
 * @example
 * // Track window scroll position
 * const { scrollY } = useScroll();
 * 
 * // Use in a component
 * useEffect(() => {
 *   if (scrollY > 100) {
 *     // Do something when page is scrolled down more than 100px
 *     setShowBackToTop(true);
 *   } else {
 *     setShowBackToTop(false);
 *   }
 * }, [scrollY]);
 * 
 * @example
 * // Track a specific element's scroll position
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { scrollY } = useScroll(containerRef);
 * 
 * // In JSX
 * // <div ref={containerRef} style={{ height: '300px', overflow: 'auto' }}>
 * //   Content goes here
 * // </div>
 */
export const useScroll = (ref?: RefObject<HTMLElement>) => {
    const [scrollY, setScrollY] = useState(0);

    const handleScroll = () => {
        if (ref && ref.current) {
            setScrollY(ref.current.scrollTop);
        } else {
            setScrollY(window.scrollY);
        }
    };

    useEffect(() => {
        const abortController = new AbortController();
        const target = ref && ref.current ? ref.current : window;

        target.addEventListener("scroll", handleScroll, { signal: abortController.signal });
        return () => {
            abortController.abort();
        };
    }, [ref]);

    return { scrollY };
};
