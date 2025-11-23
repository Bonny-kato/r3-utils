import { type CacheAdapter } from './adapters';
import { type CacheEntryType } from './cache-client';

const DB_NAME = 'r3-cache';
const DB_VERSION = 1;

export class IndexedDBCacheAdapter<TData = unknown> implements CacheAdapter<TData> {
    readonly #storeName: string;
    #dbPromise: Promise<IDBDatabase> | null = null;

    constructor(storeName: string) {
        this.#storeName = storeName;
        this.#initDB();
    }

    #initDB(): void {
        this.#dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB is not supported in this environment'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.#storeName)) {
                    db.createObjectStore(this.#storeName, { keyPath: 'key' });
                }
            };
        });
    }

    async #getDB(): Promise<IDBDatabase> {
        if (!this.#dbPromise) {
            this.#initDB();
        }
        return this.#dbPromise!;
    }

    async #executeTransaction<T>(
        mode: IDBTransactionMode,
        operation: (store: IDBObjectStore) => IDBRequest<T>
    ): Promise<T> {
        const db = await this.#getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.#storeName], mode);
            const store = transaction.objectStore(this.#storeName);
            const request = operation(store);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`IndexedDB operation failed: ${request.error?.message}`));
            };
        });
    }

    has(_queryHash: string): boolean {
        throw new Error('Synchronous has() is not supported in IndexedDB adapter. Use hasAsync() instead.');
    }

    async hasAsync(queryHash: string): Promise<boolean> {
        try {
            const result = await this.#executeTransaction('readonly', (store) =>
                store.get(queryHash)
            );
            return result !== undefined;
        } catch {
            return false;
        }
    }

    set(queryHash: string, query: CacheEntryType<TData>): void {
        this.#executeTransaction('readwrite', (store) =>
            store.put({ ...query, key: queryHash })
        ).catch(() => {});
    }

    async setAsync(queryHash: string, query: CacheEntryType<TData>): Promise<void> {
        await this.#executeTransaction('readwrite', (store) =>
            store.put({ ...query, key: queryHash })
        );
    }

    get(_queryHash: string): CacheEntryType<TData> | undefined {
        throw new Error('Synchronous get() is not supported in IndexedDB adapter. Use getAsync() instead.');
    }

    async getAsync(queryHash: string): Promise<CacheEntryType<TData> | undefined> {
        try {
            const result = await this.#executeTransaction('readonly', (store) =>
                store.get(queryHash)
            );
            return result as CacheEntryType<TData> | undefined;
        } catch {
            return undefined;
        }
    }

    delete(queryHash: string): void {
        this.#executeTransaction('readwrite', (store) =>
            store.delete(queryHash)
        ).catch(() => {});
    }

    async deleteAsync(queryHash: string): Promise<void> {
        await this.#executeTransaction('readwrite', (store) =>
            store.delete(queryHash)
        );
    }

    values(): IterableIterator<CacheEntryType<TData>> {
        throw new Error('Synchronous values() is not supported in IndexedDB adapter. Use valuesAsync() instead.');
    }

    async valuesAsync(): Promise<CacheEntryType<TData>[]> {
        try {
            const db = await this.#getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.#storeName], 'readonly');
                const store = transaction.objectStore(this.#storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result as CacheEntryType<TData>[]);
                };

                request.onerror = () => {
                    reject(new Error(`Failed to get all values: ${request.error?.message}`));
                };
            });
        } catch {
            return [];
        }
    }

    async clear(): Promise<void> {
        await this.#executeTransaction('readwrite', (store) => store.clear());
    }
}
