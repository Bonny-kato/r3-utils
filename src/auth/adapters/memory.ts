import type { AuthStorageAdapter, SessionData, UserId, UserIdentifier, } from "~/auth/adapters/auth-storage-adapter";
import { tryCatch, TryCatchResult } from "~/utils";

/**
 * Simple in-memory implementation of the AuthStorageAdapter interface.
 * Intended for tests and lightweight/local scenarios.
 *
 * Notes:
 * - Uses a Map to store session entries keyed by sessionId
 * - Maintains a sliding TTL similar to Redis adapter; entries are purged lazily on access
 */
export class MemoryStorageAdapter<User extends UserIdentifier>
    implements AuthStorageAdapter<User>
{
    readonly #collectionName: string;

    // storage per instance; namespaced by collectionName
    #store: Map<string, SessionData<User>> = new Map();

    // userId -> active sessionId mapping (for single-session feature)
    #sessions: Map<string, string> = new Map();

    constructor(collectionName: string) {
        this.#collectionName = collectionName;
    }

    // ----------------------
    // User-session mappings
    // ----------------------
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

    async remove(sessionId: string) {
        return tryCatch(async () => {
            const key = this.#generateKey(sessionId);
            const [error, exists] = await this.has(sessionId);
            if (error) return false;
            if (exists) return this.#store.delete(key);
            return true;
        });
    }

    async get(sessionId: string) {
        return tryCatch(async () => {
            const key = this.#generateKey(sessionId);
            return this.#store.get(key) ?? null;
        });
    }

    async has(sessionId: string) {
        return tryCatch<boolean>(async () => {
            const key = this.#generateKey(sessionId);
            const sessionData = this.#store.get(key);

            return Boolean(sessionData);
        });
    }

    async set(sessionId: string, data: User, expires?: Date) {
        return tryCatch<SessionData<User>>(async () => {
            const key = this.#generateKey(sessionId);

            const sessionData: SessionData<User> = { user: data, expires };
            this.#store.set(key, sessionData);

            return sessionData;
        });
    }

    update(sessionId: string, data: Partial<User>, expires?: Date) {
        return tryCatch<SessionData<User>>(async () => {
            const [getErr, existing] = await this.get(sessionId);
            if (getErr) throw getErr;
            if (!existing)
                throw new Error(
                    `User with session id ${String(sessionId)} not found`
                );

            const updatedUser = { ...existing.user, ...data } as User;
            const [setErr, result] = await this.set(
                sessionId,
                updatedUser,
                expires
            );
            if (setErr) throw setErr;
            return result!;
        });
    }

    clear() {
        this.#store.clear();
        this.#sessions.clear();
    }

    #generateKey(sessionId: string) {
        return `${this.#collectionName}:${String(sessionId)}`;
    }
}
