import { useSearchParams } from 'react-router';
import { useMemo } from 'react';

/**
 * A hook that provides access to the URL query parameters with type safety.
 * 
 * @returns An object containing the current query parameters and a function to update them.
 * 
 * @example
 * ```tsx
 * const { queryParams, setQueryParams } = useQueryParams<{ page: string; filter: string }>();
 * 
 * // Access query parameters
 * const currentPage = queryParams.page;
 * 
 * // Update query parameters
 * setQueryParams({ page: '2' });
 * ```
 */
export function useQueryParams<T extends Record<string, string>>() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params as T;
  }, [searchParams]);

  const setQueryParams = (newParams: Partial<T>) => {
    const updatedParams = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        updatedParams.delete(key);
      } else {
        updatedParams.set(key, value);
      }
    });

    setSearchParams(updatedParams);
  };

  return { queryParams, setQueryParams };
}
