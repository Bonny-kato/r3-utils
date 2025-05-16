import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { serializeQueryParams } from "../utils";
/**
 * A hook that provides a state-like interface for URL search parameters.
 * It allows you to read and update URL search parameters with a React state-like API.
 *
 * @template TData - The type of the search parameters object
 * @param {TData} [defaultParams] - Optional default parameters to use when the URL has no parameters
 * @returns {[TData, (p: TData) => void]} A tuple containing the current parameters and a function to update them
 *
 * @example
 * // Basic usage with TypeScript
 * interface SearchParams {
 *   page?: number;
 *   query?: string;
 *   category?: string;
 * }
 *
 * const [searchParams, setSearchParams] = useSearchParamsState<SearchParams>();
 *
 * // Read current parameters
 * console.log(searchParams.page); // Current page from URL
 *
 * // Update parameters - this will update the URL
 * setSearchParams({ page: 2 }); // Updates only the page parameter
 *
 * @example
 * // With default parameters
 * const [filters, setFilters] = useSearchParamsState({
 *   page: 1,
 *   sortBy: 'name'
 * });
 *
 * // In a filter component
 * const handlePageChange = (newPage) => {
 *   setFilters({ ...filters, page: newPage });
 * };
 */
export const useSearchParamsState = <
    TData extends { [key: string]: string | string[] },
>(
    defaultParams?: TData
): [TData, (p: TData) => void] => {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();

    const params = useMemo(() => {
        return Object.fromEntries(new URLSearchParams(search)) as TData;
    }, [search]);

    const setParams = (p: TData) => {
        if (p) {
            const queryParams = serializeQueryParams({ ...params, ...p });
            navigate(`${pathname}?${queryParams}`, { replace: true });
        }
    };

    useEffect(() => {
        if (defaultParams) setParams(defaultParams);
    }, []);

    return [params, setParams];
};
