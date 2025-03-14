import {
    type CacheAdapter,
    InMemoryCacheAdapter,
} from "./adapters";

/**
 * Represents a cache entry with data and metadata.
 * 
 * @template TData - The type of data stored in the cache entry
 * @property {TData} data - The actual data stored in the cache
 * @property {number} [expiry] - Optional timestamp when the entry expires
 * @property {string} key - Unique identifier for the cache entry
 * @property {number} ttl - Time to live in milliseconds
 */
export interface CacheEntryType<TData = unknown> {
    data: TData;
    expiry?: number;
    key: string;
    ttl: number;
}

/**
 * Type for delete event names in the format "delete:keyName"
 */
type DeleteEventName<T extends string = string> = `delete:${T}`;
/**
 * Type for update event names in the format "update:keyName"
 */
type UpdateEventName<T extends string = string> = `update:${T}`;
/**
 * Type for add event names in the format "add:keyName"
 */
type AddEventName<T extends string = string> = `add:${T}`;
/**
 * Type for invalidate event names in the format "invalidate:keyName"
 */
type InvalidateEventName<T extends string = string> = `invalidate:${T}`;

/**
 * Array of all possible cache actions
 */
const actions = ["delete", "update", "add", "invalidate"] as const;
/**
 * Union type of all possible cache actions
 */
type CacheActions = (typeof actions)[number];

/**
 * Union type for all event names used in the cache system
 * 
 * @template T - The base string type for the event name
 */
export type EventName<T extends string = string> =
    | DeleteEventName<T>
    | UpdateEventName<T>
    | InvalidateEventName<T>
    | AddEventName<T>;

/**
 * Main cache client that manages cache entries and their lifecycle.
 * 
 * The CacheClient provides methods for storing, retrieving, and managing cached data.
 * It supports different storage adapters and includes features like:
 * - Automatic expiration of cache entries
 * - Event-based notifications for cache operations
 * - Observer pattern for tracking cache usage
 * 
 * @template TData - The type of data stored in the cache
 * 
 * @example
 * // Create a new cache client with the default in-memory adapter
 * const cache = new CacheClient();
 * 
 * // Set a cache entry
 * cache.set('user-123', { 
 *   data: { name: 'John', age: 30 }, 
 *   key: 'user-123', 
 *   ttl: 60000 
 * });
 * 
 * // Get a cache entry
 * const user = cache.get('user-123');
 */
export class CacheClient<TData = unknown> {
    #adapter: CacheAdapter<TData>;
    #events = new Map<EventName, CustomEvent<unknown>>();
    #observers = new Set();

    constructor(adapter?: CacheAdapter<TData>) {
        this.#adapter = adapter ?? new InMemoryCacheAdapter();
        this.runGc = this.runGc.bind(this);
    }

    /**
     * Sets a cache entry with a specified key and value.
     * @param key The key for the cache entry.
     * @param entry The cache entry to store.
     */
    set(key: string, entry: CacheEntryType<TData>): void {
        const entryWithExpiry = { ...entry, expiry: Date.now() + entry.ttl };
        this.#adapter.set(key, entryWithExpiry);
        this.registerEventsForKey(key);
    }

    /**
     * Retrieves a cache entry by its key.
     * @param key The key for the cache entry.
     * @returns The cache entry if present, otherwise undefined.
     */
    get<TData = unknown>(key: string): CacheEntryType<TData> | undefined {
        return this.#adapter.get(key) as never as CacheEntryType<TData>;
    }

    /**
     * Deletes a cache entry by its key.
     * @param key The key for the cache entry.
     */
    delete(key: string): void {
        this.#adapter.delete(key);
        this.dispatchEvent(this.createEventKey("delete", key));
        this.removeEvent(key);
    }

    /**
     * Dispatches an event for a given event key.
     * @param eventKey The event key to dispatch.
     */
    dispatchEvent(eventKey: EventName): void {
        const eventDispatcher = this.#events.get(eventKey);
        if (eventDispatcher) {
            window.dispatchEvent(eventDispatcher);
        }
    }

    /**
     * Generates a unique event key based on the action and cache key.
     * @param action The cache action (for example, "delete").
     * @param key The cache key.
     * @returns The event name.
     */
    createEventKey(action: CacheActions, key: string): EventName {
        return `${action}:${key}`;
    }

    /**
     * Adds an observer for a specific cache key.
     * 
     * When a key is being observed, its cache entry won't be removed during garbage collection
     * even if it has expired. This is useful for components that are actively using the cached data.
     * 
     * @param key The cache key to observe
     * 
     * @example
     * // Start observing a cache key
     * cache.addObserver('user-profile');
     */
    addObserver(key: string) {
        this.#observers.add(key);
    }

    /**
     * Removes an observer for a specific cache key.
     * 
     * Once a key is no longer being observed and its entry has expired,
     * it will be removed during the next garbage collection cycle.
     * 
     * @param key The cache key to stop observing
     * 
     * @example
     * // Stop observing a cache key
     * cache.removeObserver('user-profile');
     */
    removeObserver(key: string) {
        this.#observers.delete(key);
    }

    /**
     * Cleans up expired cache entries.
     * 
     * This method is automatically called at regular intervals when using the CacheProvider.
     * It removes any expired entries that are not being observed.
     */
    runGc(): void {
        for (const entry of this.#adapter.values()) {
            if (this.hasExpired(entry)) {
                this.delete(entry.key);
            }
        }
    }

    /**
     * Dispatches an invalidate event for a specific cache key.
     * 
     * This method can be used to manually invalidate a cache entry, which will
     * notify any components that are listening for invalidation events on this key.
     * It doesn't remove the entry from the cache, but signals that it should be refreshed.
     * 
     * @param key The cache key to invalidate
     * 
     * @example
     * // Invalidate a cache entry
     * cache.dispatchInvalidateEvent('user-profile');
     */
    dispatchInvalidateEvent(key: string): void {
        this.dispatchEvent(this.createEventKey("invalidate", key));
    }

    /**
     * Registers events for all actions on a specific cache key.
     * @param cacheKey The cache key to register events for.
     */
    private registerEventsForKey(cacheKey: string): void {
        for (const action of actions) {
            this.addEvent(action as CacheActions, cacheKey);
        }
    }

    /**
     * Checks if a cache entry has expired.
     * @param entry The cache entry to check.
     * @returns True if the entry has expired, otherwise false.
     */
    private hasExpired(entry: CacheEntryType<TData>): boolean {
        return (
            Number(entry.expiry) <= Date.now() &&
            !this.#observers.has(entry.key)
        );
    }

    /**
     * Creates a custom event with the given name and optional data.
     * @param eventName The name of the event.
     * @param data Optional data to include with the event.
     * @returns The created custom event.
     */
    private createEvent(
        eventName: EventName,
        data?: unknown
    ): CustomEvent<unknown> {
        return new CustomEvent(eventName, { detail: data });
    }

    /**
     * Adds an event for a specific action and cache key.
     * @param action The cache action (for example, "delete").
     * @param key The cache key.
     */
    private addEvent(action: CacheActions, key: string): void {
        const eventKey = this.createEventKey(action, key);
        const customEvent = this.createEvent(eventKey);
        this.#events.set(eventKey, customEvent);
    }

    /**
     * Removes an event for a given cache key.
     * @param entryKey The cache key to remove the event for.
     */
    private removeEvent(entryKey: string): void {
        this.#events.delete(this.createEventKey("delete", entryKey));
    }
}
