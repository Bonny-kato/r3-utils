import { CacheAdapter, InMemoryCacheAdapter, LocalStorageCacheAdapter } from "./adapters";
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
    CacheClient,
};
export type {
    FetchOptions,
    FetchOptionsWithoutResource,
    UnwrapNestedPromise,
    CacheAdapter,
    CacheEntryType,
};
