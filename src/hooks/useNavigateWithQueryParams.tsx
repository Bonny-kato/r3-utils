import { forwardRef } from "react";
import { Link, LinkProps, NavigateOptions, useNavigate } from "react-router";
import { serializeQueryParams } from "../utils";
import { useSearchParamsState } from "./useSearchParamsState";

/**
 * Internal hook that generates a pathname with the current query parameters.
 *
 * @returns A function that takes a pathname and returns it with the current query parameters
 * @internal
 */
const useGeneratePathnameWithQueryParams = () => {
    const [searchParams] = useSearchParamsState<{ page: number; q: string }>();
    return (to: string) => {
        const urlSearchParams = serializeQueryParams(searchParams);
        return `${to}?${urlSearchParams}`;
    };
};

/**
 * A hook that provides a navigation function that preserves the current query parameters.
 * This is useful when you want to navigate to a new page while keeping the current filters,
 * search terms, pagination, etc.
 *
 * @returns A function that navigates to the given path while preserving query parameters
 *
 * @example
 * // In a component
 * const navigateWithParams = useNavigateWithQueryParams();
 *
 * // Later in an event handler
 * const handleClick = () => {
 *   // If current URL is /products?page=2&q=shoes
 *   navigateWithParams('/categories');
 *   // Will navigate to /categories?page=2&q=shoes
 * };
 */
export const useNavigateWithQueryParams = () => {
    const navigate = useNavigate();
    const generatePathnameWithDataFilterParams = useGeneratePathnameWithQueryParams();

    return (to: string, options?: NavigateOptions) => {
        navigate(generatePathnameWithDataFilterParams(to), options);
    };
};

/**
 * A Link component that preserves the current query parameters when navigating.
 * This is a wrapper around React Router's Link component that automatically
 * includes the current query parameters in the destination URL.
 *
 * @param props - Standard LinkProps from React Router
 * @returns A Link component that preserves query parameters
 *
 * @example
 * // In a component
 * return (
 *   <nav>
 *     // If current URL is /products?page=2&q=shoes
 *     <LinkWithQueryParams to="/categories">Categories</LinkWithQueryParams>
 *     // Will navigate to /categories?page=2&q=shoes
 *   </nav>
 * );
 */
export const LinkWithQueryParams = forwardRef<HTMLAnchorElement, LinkProps>(
    ({ to, ...rest }, ref) => {
        const generatePathnameWithQueryParams = useGeneratePathnameWithQueryParams();

        return <Link ref={ref} to={generatePathnameWithQueryParams(String(to))} {...rest} />;
    }
);

LinkWithQueryParams.displayName = "LinkWithQueryParams";
