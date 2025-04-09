import { type CacheEntryType } from './cache-client';
import { ExtendedLocalStorage as LocalStorage } from '../utils/local-storage';

/**
 * Interface for cache adapters that provide storage functionality for the cache system.
 *
 * Cache adapters abstract the storage mechanism used by the cache client,
 * allowing different storage backends to be used interchangeably.
 *
 * @template TData - The type of data stored in the cache
 */
export interface CacheAdapter<TData = unknown> {
    /**
     * Checks if an entry exists in the cache
     *
     * @param {string} queryHash - The key to check
     * @returns {boolean} True if the entry exists, false otherwise
     */
    has: (queryHash: string) => boolean;

    /**
     * Stores an entry in the cache
     *
     * @param {string} queryHash - The key to store the entry under
     * @param {CacheEntryType<TData>} query - The cache entry to store
     */
    set: (queryHash: string, query: CacheEntryType<TData>) => void;

    /**
     * Retrieves an entry from the cache
     *
     * @param {string} queryHash - The key to retrieve
     * @returns {CacheEntryType<TData> | undefined} The cache entry if found, undefined otherwise
     */
    get: (queryHash: string) => CacheEntryType<TData> | undefined;

    /**
     * Deletes an entry from the cache
     *
     * @param {string} queryHash - The key to delete
     */
    delete: (queryHash: string) => void;

    /**
     * Returns an iterator over all values in the cache
     *
     * @returns {IterableIterator<CacheEntryType<TData>>} Iterator over all cache entries
     */
    values: () => IterableIterator<CacheEntryType<TData>>;
}

/**
 * In-memory implementation of the CacheAdapter interface.
 *
 * This adapter stores cache entries in memory using a JavaScript Map.
 * It's fast and simple, but data is lost when the page is refreshed or the app is closed.
 *
 * @template TData - The type of data stored in the cache
 *
 * @example
 * // Create a new in-memory cache adapter
 * const adapter = new InMemoryCacheAdapter();
 *
 * // Use it with a cache client
 * const cacheClient = new CacheClient(adapter);
 */
export class InMemoryCacheAdapter<TData = unknown> implements CacheAdapter<TData> {
    /**
     * Internal Map used to store cache entries
     */
    #cache: Map<string, CacheEntryType<TData>> = new Map();

    /**
     * Checks if an entry exists in the cache
     *
     * @param {string} queryHash - The key to check
     * @returns {boolean} True if the entry exists, false otherwise
     */
    has(queryHash: string): boolean {
        return this.#cache.has(queryHash);
    }

    /**
     * Stores an entry in the cache
     *
     * @param {string} queryHash - The key to store the entry under
     * @param {CacheEntryType<TData>} query - The cache entry to store
     */
    set(queryHash: string, query: CacheEntryType<TData>): void {
        this.#cache.set(queryHash, query);
    }

    /**
     * Retrieves an entry from the cache
     *
     * @param {string} queryHash - The key to retrieve
     * @returns {CacheEntryType<TData> | undefined} The cache entry if found, undefined otherwise
     */
    get(queryHash: string): CacheEntryType<TData> | undefined {
        return this.#cache.get(queryHash);
    }

    /**
     * Deletes an entry from the cache
     *
     * @param {string} queryHash - The key to delete
     */
    delete(queryHash: string): void {
        this.#cache.delete(queryHash);
    }

    /**
     * Returns an iterator over all values in the cache
     *
     * @returns {IterableIterator<CacheEntryType<TData>>} Iterator over all cache entries
     */
    values(): IterableIterator<CacheEntryType<TData>> {
        return this.#cache.values();
    }
}

/**
 * LocalStorage implementation of the CacheAdapter interface.
 *
 * This adapter stores cache entries in the browser's localStorage,
 * allowing data to persist between page refreshes and browser sessions.
 *
 * Note that localStorage has size limitations (typically 5-10MB) and
 * only supports string values, so serialization/deserialization is handled
 * by the underlying LocalStorage utility.
 *
 * @template TData - The type of data stored in the cache
 *
 * @example
 * // Create a new localStorage cache adapter
 * const adapter = new LocalStorageCacheAdapter('my-app-cache');
 *
 * // Use it with a cache client
 * const cacheClient = new CacheClient(adapter);
 */
export class LocalStorageCacheAdapter<TData = unknown> implements CacheAdapter<TData> {
    /**
     * Internal LocalStorage wrapper used to store cache entries
     */
    #cache: LocalStorage;

    /**
     * Creates a new LocalStorageCacheAdapter
     *
     * @param {string} storageName - A unique name for this cache in localStorage
     */
    constructor(storageName: string) {
        this.#cache = new LocalStorage(storageName);
    }

    /**
     * Deletes an entry from the cache
     *
     * @param {string} queryHash - The key to delete
     */
    delete(queryHash: string): void {
        this.#cache.removeValues(queryHash);
    }

    /**
     * Retrieves an entry from the cache
     *
     * @param {string} queryHash - The key to retrieve
     * @returns {CacheEntryType<TData> | undefined} The cache entry if found, undefined otherwise
     */
    get(queryHash: string): CacheEntryType<TData> | undefined {
        return this.#cache.getValue(queryHash);
    }

    /**
     * Checks if an entry exists in the cache
     *
     * @param {string} queryHash - The key to check
     * @returns {boolean} True if the entry exists, false otherwise
     */
    has(queryHash: string): boolean {
        return this.#cache.has(queryHash);
    }

    /**
     * Stores an entry in the cache
     *
     * @param {string} cacheKey - The key to store the entry under
     * @param {CacheEntryType<TData>} query - The cache entry to store
     */
    set(cacheKey: string, query: CacheEntryType<TData>): void {
        this.#cache.setValue(cacheKey, query);
    }

    /**
     * Returns an iterator over all values in the cache
     *
     * @returns {IterableIterator<CacheEntryType<TData>>} Iterator over all cache entries
     */
    values(): IterableIterator<CacheEntryType<TData>> {
        return this.#cache.values() as IterableIterator<CacheEntryType<TData>>;
    }
}
