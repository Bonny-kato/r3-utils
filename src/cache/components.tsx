import {
    createContext,
    type FC,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { type LoaderFunction, useFetcher } from "react-router";
import { useEventListener } from "../hooks";
import { CacheClient, type CacheEntryType } from "./cache-client";
import {
    unwrapNestedPromise,
    type UnwrapNestedPromise,
} from "./unwrap-nested-promise"; ////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//#region useFetch hook
////////////////////////////////////////////////////////////////////////////////

/**
 * Utility type that extracts the return type of loader function
 *
 * @template T - The loader function type
 */
export type LoaderFuncReturnType<T extends LoaderFunction> = Awaited<
    ReturnType<T>
>;

/**
 * Return type of the useFetch hook
 *
 * @template T - The loader function type
 * @property {UnwrapNestedPromise<LoaderFuncReturnType<T>> | undefined} data - The fetched data, or undefined if not yet loaded
 * @property {boolean} isLoading - True when the data is being loaded for the first time
 * @property {boolean} isFetching - True when the data is being fetched (initial load or refresh)
 * @property {string} key - The cache key used for this data
 */
type UseCachedFetcher<T extends LoaderFunction> = {
    data: UnwrapNestedPromise<LoaderFuncReturnType<T>> | undefined;
    isLoading: boolean;
    isFetching: boolean;
    key: string;
};
const TWO_MINUTES = 120_000; // Minute 2

export interface FetchOptions {
    /**
     * The URL to fetch data from. If not provided, it will use the current location pathname
     * @default currentLocation.pathname
     */
    resource: string;
    /**
     * Control when to run fetch data
     * @default true
     */
    enabled?: boolean;

    /**
     * Time in milliseconds that the cached data will be considered valid
     * @default 120000 (2 minutes)
     */
    ttl?: number;
    /**
     * Whether to cache the fetched data or not
     * @default true
     */
    shouldCache?: boolean;
    /**
     * Custom cache key to use for storing the data. If not provided, it will use the {@link resource}
     * @default resource
     */
    cacheKey?: string;
    /**
     * Whether to fetch data when the window regains focus
     * @default true
     */
    fetchOnFocus?: boolean;
    /**
     * Whether to fetch data when the network connection is restored
     * @default true
     */
    fetchOnReconnect?: boolean;

    fetchKey: string;
}

/**
 * A version of FetchOptions without the resource property
 */
export type FetchOptionsWithoutResource = Omit<FetchOptions, "resource">;

/**
 * A hook for fetching and caching data from a resource.
 *
 * This hook provides a convenient way to fetch data from a resource (URL) and cache it.
 * It handles loading states, error handling, and cache invalidation automatically.
 *
 * Features:
 * - Automatic caching with configurable TTL
 * - Loading and fetching states
 * - Error handling with automatic error boundary integration
 * - Refetching on window focus and network reconnection
 * - Cache key customization
 *
 * @template T - The loader function type
 * @param {FetchOptions} [options] - Options for fetching and caching
 * @returns {UseCachedFetcher<T>} An object containing the fetched data and status information
 *
 * @example
 * // Basic usage with default options
 * const { data, isLoading } = useFetch();
 *
 * @example
 * // Custom resource and cache settings
 * const { data, isLoading } = useFetch({
 *   resource: '/api/users',
 *   ttl: 300000, // 5 minutes
 *   cacheKey: 'users-list',
 *   fetchOnFocus: false
 * });
 */
export const useFetch = <T extends LoaderFunction>(
    options: FetchOptions
): UseCachedFetcher<T> => {
    type LoaderData = LoaderFuncReturnType<T>;

    const $cache = useCacheClient();

    const resourceToFetchFrom = options.resource;

    const cacheKeyToUse = useMemo(() => {
        return options?.cacheKey ?? resourceToFetchFrom;
    }, [options?.cacheKey, resourceToFetchFrom]);

    const cachedData =
        $cache.get<UnwrapNestedPromise<LoaderData>>(cacheKeyToUse);

    const [data, setData] = useState<
        UnwrapNestedPromise<LoaderData> | undefined
    >(() => cachedData?.data);

    const [error, setError] = useState<unknown>(null);
    const [isFetching, setIsFetching] = useState(false);

    const { load, data: fetcherData } = useFetcher({
        key: options.fetchKey,
    });

    const [isLoading, setIsLoading] = useState(false);
    const shouldFetch = options?.enabled ?? true;
    const shouldCache = options?.shouldCache ?? true;

    /**
     * Updates the component state with fetched data and caches it if needed.
     *
     * This function:
     * 1. Unwraps any nested promises in the data
     * 2. Updates loading states
     * 3. Handles any errors
     * 4. Caches the data if caching is enabled
     * 5. Updates the component state with the fetched data
     *
     * @param {LoaderData} dataFromServer - The data returned from the server
     */
    const updateDataStateAndCache = useCallback(
        async (dataFromServer: LoaderData) => {
            const { data, error } = await unwrapNestedPromise(dataFromServer);

            setIsFetching(false);
            setIsLoading(false);

            if (error) return setError(error);
            else {
                if (shouldCache) {
                    const cacheEntry: CacheEntryType = {
                        data,
                        key: cacheKeyToUse,
                        ttl: options?.ttl ?? TWO_MINUTES,
                    };

                    $cache.set(cacheKeyToUse, cacheEntry);
                }
                return setData(data);
            }
        },
        [cacheKeyToUse]
    );

    /**
     * Tracks any errors and throws them to be caught by the nearest error boundary.
     */
    useEffect(() => {
        if ((!isLoading || !isFetching) && error) {
            throw error;
        }
    }, [error, isLoading, isFetching]);

    /**
     * Fetches data from the server using the React Router fetcher.
     *
     * This function:
     * 1. Updates fetching state
     * 2. Loads data from the specified resource
     * 3. Handles any errors that occur during fetching
     *
     * @param {boolean} [isInitialLoad=false] - Whether this is the initial load of data
     */
    const fetchDataFromServer = useCallback(
        async (isInitialLoad = false) => {
            if (!isInitialLoad) {
                setIsFetching(true);
            }

            try {
                await load(resourceToFetchFrom);
            } catch (e) {
                setError(e);
            }
        },
        [load, resourceToFetchFrom]
    );

    //--------------------------------------------------------------

    useEffect(() => {
        if (shouldFetch) {
            setIsLoading(!cachedData);
            fetchDataFromServer(!cachedData).then();
        }
    }, [resourceToFetchFrom, shouldFetch, fetchDataFromServer]);

    //--------------------------------------------------------------

    /**
     *  Handle 'data fetch'.
     *  When 'dataFetcher.data' changes, implying that we have new data from the server,
     *  we run the 'updateDataStateAndCache' function to cache the data for future use.
     */
    useEffect(() => {
        if (fetcherData) {
            const dataFromServer = fetcherData as LoaderData;
            updateDataStateAndCache(dataFromServer).then();
        }
    }, [fetcherData, updateDataStateAndCache]);

    //--------------------------------------------------------------

    ////////////////////////////////////////////////////////////////////////////////
    //#region Events listeners
    ////////////////////////////////////////////////////////////////////////////////

    useEventListener("focus", () => fetchDataFromServer(), {
        disabled: !(options?.fetchOnFocus ?? true) || isLoading,
    });

    useEventListener(
        "online",
        async () => {
            setIsLoading(true);
            await fetchDataFromServer(true);
        },
        {
            disabled: !(options?.fetchOnReconnect ?? true),
        }
    );

    // endregion

    useCacheObserver(cacheKeyToUse);

    return {
        data,
        isFetching: isFetching,
        isLoading,
        key: cacheKeyToUse,
    };
};
//endregion

////////////////////////////////////////////////////////////////////////////////
//#region useCacheObserver
////////////////////////////////////////////////////////////////////////////////

/**
 * A hook that registers and unregisters a cache observer for a specific key.
 *
 * When a component uses this hook, it tells the cache system that the data
 * for the specified key is being actively used. This prevents the cache entry
 * from being removed during garbage collection, even if it has expired.
 *
 * The observer is automatically removed when the component unmounts.
 *
 * @param {string} key - The cache key to observe
 *
 * @example
 * // Register as an observer for a cache key
 * useCacheObserver('user-profile');
 */
const useCacheObserver = (key: string) => {
    const $cache = useCacheClient();
    useEffect(() => {
        $cache.addObserver(key);
        return () => $cache.removeObserver(key);
    }, [key]);
};
//endregion

////////////////////////////////////////////////////////////////////////////////
//#region CacheProvider
////////////////////////////////////////////////////////////////////////////////

/**
 * One minute in milliseconds, used as the default garbage collection interval
 */
const ONE_MINUTE = 60_000;

/**
 * Type for the cache context value
 */
type CacheContextType = {
    $cache: CacheClient;
};

/**
 * React context for providing the cache client to components
 */
const CacheContext = createContext<CacheContextType | null>(null);

/**
 * Hook to access the cache client from the context.
 *
 * This hook must be used within a component that is a child of a CacheProvider.
 * It provides access to the cache client instance for direct cache operations.
 *
 * @returns {CacheClient} The cache client instance
 * @throws {Error} If used outside of a CacheProvider
 *
 * @example
 * // Access the cache client in a component
 * const cache = useCacheClient();
 *
 * // Manually set a cache entry
 * cache.set('manual-key', {
 *   data: someData,
 *   key: 'manual-key',
 *   ttl: 60000
 * });
 */
export const useCacheClient = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error("useCacheClient must be used within a CacheProvider");
    }
    return context.$cache;
};

/**
 * Props for the CacheProvider component
 *
 * @property {CacheClient} cacheClient - The cache client instance to provide
 * @property {ReactNode} children - Child components that will have access to the cache
 * @property {number} [gcTime=ONE_MINUTE] - Interval in milliseconds for garbage collection
 */
type CacheProviderProps = {
    cacheClient: CacheClient;
    children: ReactNode;
    gcTime?: number;
};

/**
 * Provider component for the cache system.
 *
 * This component sets up the cache context and manages the garbage collection interval.
 * It should be placed near the root of your application to make the cache available
 * to all components that need it.
 *
 * @param {CacheProviderProps} props - The component props
 * @returns  The provider component
 *
 * @example
 * // In your root component
 * import { CacheClient } from '~/utils/cache/cache-client';
 * import { CacheProvider } from '~/utils/cache/components';
 *
 * const cacheClient = new CacheClient();
 *
 * function App() {
 *   return (
 *     <CacheProvider cacheClient={cacheClient} gcTime={300000}>
 *       <YourApp />
 *     </CacheProvider>
 *     );
 * }
 */
export const CacheProvider: FC<CacheProviderProps> = ({
    cacheClient,
    children,
    gcTime = ONE_MINUTE,
}: CacheProviderProps) => {
    const $gcIntervalRef = useRef<ReturnType<typeof setInterval>>(null);

    useEffect(() => {
        $gcIntervalRef.current = setInterval(cacheClient.runGc, gcTime);

        return () => {
            if (!$gcIntervalRef.current) return;
            clearInterval($gcIntervalRef.current);
            cacheClient.clear();
        };
    }, [cacheClient, gcTime]);

    return (
        <CacheContext.Provider value={{ $cache: cacheClient }}>
            {children}
        </CacheContext.Provider>
    );
};

//endregion
