import { useLocation } from "react-router";

/**
 * Type for path matching patterns that can be either a string or RegExp
 */
type PathMatcher = string | RegExp;

/**
 * Configuration options for path matching behavior
 */
type PathMatcherOptions = {
    /**
     * When true, requires the entire pathname to match exactly
     * When false, checks if the pathname starts with the provided pattern
     * @default true
     */
    exact?: boolean;

    /**
     * When true, performs case-sensitive matching
     * When false, converts both pathname and matcher to lowercase before comparing
     * @default false
     */
    sensitive?: boolean;

    /**
     * When true, checks if the pathname includes the provided segment anywhere in the path
     * For example, 'users' would match '/admin/users' or '/users/123'
     * @default false
     */
    includesSegment?: boolean;
};

/**
 * A custom hook that checks if the current pathname matches a given pattern.
 *
 * @param pathMatcher - A string path or RegExp pattern to match against the current pathname
 * @param options - Configuration options for path matching behavior
 * @returns boolean - Returns true if the current pathname matches according to the specified options
 *
 * @example
 * // Basic exact path matching
 * const isProfilePage = useIsPathActive('/profile');
 *
 * @example
 * // Check if pathname includes 'users' segment
 * const hasUsersSegment = useIsPathActive('users', { includesSegment: true });
 * // Matches: '/users', '/admin/users', '/users/123'
 *
 * @example
 * // Non-exact prefix matching
 * const isInProductsSection = useIsPathActive('/products', { exact: false });
 * // Matches: '/products', '/products/123', '/products/edit'
 *
 * @example
 * // Case-sensitive matching
 * const isAdminSection = useIsPathActive('/Admin', { sensitive: true });
 *
 * @example
 * // Using RegExp for complex patterns
 * const isDynamicUserPage = useIsPathActive(/^\/users\/[^/]+$/);
 */
export const useIsPathActive = (
    pathMatcher: PathMatcher,
    options: PathMatcherOptions = {}
): boolean => {
    const { pathname } = useLocation();
    const { exact = true, sensitive = false, includesSegment = false } = options;

    // Handle segment inclusion checking
    if (includesSegment && typeof pathMatcher === "string") {
        const pathSegments = pathname.split("/").filter(Boolean);
        const matcherSegment = pathMatcher.split("/").filter(Boolean)[0];

        return sensitive
            ? pathSegments.includes(matcherSegment)
            : pathSegments.some(
                  (segment) => segment.toLowerCase() === matcherSegment.toLowerCase()
              );
    }

    // Handle RegExp patterns
    if (pathMatcher instanceof RegExp) {
        return pathMatcher.test(pathname);
    }

    // Handle string patterns
    const normalizedPathname = sensitive ? pathname : pathname.toLowerCase();

    const normalizedMatcher = sensitive ? pathMatcher : pathMatcher.toLowerCase();
    if (!exact) {
        return normalizedPathname.startsWith(normalizedMatcher);
    }
    return normalizedPathname === normalizedMatcher;
};
