import type {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "~/auth/adapters/auth-storage-adapter";
import { tryCatch, TryCatchResult } from "~/utils"; // Default TTL for entries in seconds (10 minutes), same as Redis adapter

// Default TTL for entries in seconds (10 minutes), same as Redis adapter
const DEFAULT_TTL_SECONDS = 600;

type Seconds = number;

type StoredEntry<User> = {
    value: User;
    /** Epoch milliseconds when this entry expires; undefined means no expiration */
    expiresAt?: number;
};

/**
 * Simple in-memory implementation of the AuthStorageAdapter interface.
 * Intended for tests and lightweight/local scenarios.
 *
 * Notes:
 * - Uses a Map to store serialized user entries per collection name instance
 * - Supports optional TTL similar to Redis adapter; entries are purged lazily on access
 */
export class MemoryStorageAdapter<User extends UserIdentifier>
    implements AuthStorageAdapter<User>
{
    readonly #collectionName: string;
    readonly #defaultTTL: Seconds;

    // storage per instance; we namespace entries by collectionName for clarity
    #store: Map<string, StoredEntry<User>> = new Map();

    // separate map for userId -> active sessionId
    #sessions: Map<string, string> = new Map();

    constructor(collectionName: string, options?: { ttlSeconds?: Seconds }) {
        this.#collectionName = collectionName;
        this.#defaultTTL = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    }
    setUserSession(
        userId: UserId,
        sessionId: string
    ): Promise<TryCatchResult<boolean>> {
        return tryCatch(async () => {
            this.#sessions.set(String(userId), sessionId);
            return true;
        });
    }
    getUserActiveSession(
        userId: UserId
    ): Promise<TryCatchResult<string | null>> {
        return tryCatch(async () => {
            return this.#sessions.get(String(userId)) ?? null;
        });
    }
    removeUserSession(userId: UserId): Promise<TryCatchResult<boolean>> {
        return tryCatch(async () => {
            return this.#sessions.delete(String(userId));
        });
    }

    async getAll() {
        return tryCatch<User[]>(async () => {
            this.#purgeExpired();
            return Array.from(this.#store.values()).map((e) => e.value);
        });
    }

    async remove(userId: UserId) {
        return tryCatch(async () => {
            const key = this.#generateUserKey(userId);
            const [error, userExist] = await this.has(userId);

            if (error) {
                return false;
            }

            if (userExist) {
                return this.#store.delete(key);
            }

            return true;
        });
    }

    async get(userId: UserId) {
        return tryCatch<User | null>(async () => {
            const key = this.#generateUserKey(userId);
            const entry = this.#store.get(key);
            if (!entry) return null;
            if (this.#isExpired(entry)) {
                this.#store.delete(key);
                return null;
            }
            return entry.value;
        });
    }

    async has(userId: UserId) {
        return tryCatch<boolean>(async () => {
            const key = this.#generateUserKey(userId);
            const entry = this.#store.get(key);
            if (!entry) return false;
            if (this.#isExpired(entry)) {
                this.#store.delete(key);
                return false;
            }
            return true;
        });
    }

    async set(userId: UserId, data: User) {
        return tryCatch<User>(async () => {
            const key = this.#generateUserKey(userId);
            const expiresAt = Date.now() + this.#defaultTTL * 1000;
            this.#store.set(key, { value: data, expiresAt });
            return data;
        });
    }

    update(userId: UserId, data: Partial<User>) {
        return tryCatch<User>(async () => {
            const [getErr, existing] = await this.get(userId);
            if (getErr) throw getErr;
            if (!existing)
                throw new Error(`User with id ${String(userId)} not found`);

            const updated = { ...existing, ...data } as User;
            const [setErr] = await this.set(userId, updated);
            if (setErr) throw setErr;
            return updated;
        });
    }

    async resetExpiration(userId: UserId) {
        return tryCatch<boolean>(async () => {
            const key = this.#generateUserKey(userId);
            const entry = this.#store.get(key);
            if (!entry) return false;
            if (this.#isExpired(entry)) {
                this.#store.delete(key);
                return false;
            }
            entry.expiresAt = Date.now() + this.#defaultTTL * 1000;
            this.#store.set(key, entry);
            return true;
        });
    }

    clear() {
        this.#store.clear();
    }

    #generateUserKey(userId: UserId) {
        return `${this.#collectionName}:${String(userId)}`;
    }

    #isExpired(entry: StoredEntry<User>) {
        return (
            typeof entry.expiresAt === "number" && entry.expiresAt <= Date.now()
        );
    }

    #purgeExpired() {
        const now = Date.now();
        for (const [key, entry] of this.#store.entries()) {
            if (typeof entry.expiresAt === "number" && entry.expiresAt <= now) {
                this.#store.delete(key);
            }
        }
    }
}
