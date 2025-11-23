import { CacheAdapter, InMemoryCacheAdapter, LocalStorageCacheAdapter, IndexedDBCacheAdapter } from "./adapters";
import { CacheClient, CacheEntryType } from "./cache-client";
import {
    CacheProvider,
    FetchOptions,
    FetchOptionsWithoutResource,
    useCacheClient,
    useFetch,
} from "./components";
import { UnwrapNestedPromise, unwrapNestedPromise } from "./unwrap-nested-promise";

// Re-export all functions, types, and components
export {
    useFetch,
    useCacheClient,
    CacheProvider,
    unwrapNestedPromise,
    InMemoryCacheAdapter,
    LocalStorageCacheAdapter,
    IndexedDBCacheAdapter,
    CacheClient,
};
export type {
    FetchOptions,
    FetchOptionsWithoutResource,
    UnwrapNestedPromise,
    CacheAdapter,
    CacheEntryType,
};
