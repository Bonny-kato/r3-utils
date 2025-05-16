import Redis, { type RedisOptions } from "ioredis";
import {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "../auth-storage-adpter";

/**
 * Redis-based implementation of the AuthStorageAdapter interface.
 *
 * This adapter uses Redis for high-performance storage of user data.
 * It's designed for production environments with high traffic or when
 * scaling across multiple servers. User data is stored as JSON strings
 * in Redis, with a set to track all user IDs.
 *
 * @template User - The user type that extends UserIdentifier
 */
export class RedisStorageAdapter<User extends UserIdentifier>
    implements AuthStorageAdapter<User>
{
    /**
     * The Redis client instance used for data storage operations.
     */
    #redsClient: Redis;

    /**
     * The collection name used as a namespace for Redis keys.
     */
    readonly #collectionName: string;

    /**
     * The Redis key used to store the set of all user IDs.
     */
    readonly #userSetKey: string;

    /**
     * Creates a new RedisStorageAdapter instance.
     *
     * @param collectionName - The name of the collection to use as a namespace for Redis keys
     * @param option - Optional Redis connection options
     */
    constructor(collectionName: string, option?: RedisOptions) {
        this.#collectionName = collectionName;
        this.#redsClient = new Redis({
            ...option,
        });
        this.#userSetKey = `${this.#collectionName}:user_ids`;
    }

    /**
     * Retrieves all users stored in the adapter.
     *
     * Uses Redis pipeline to efficiently fetch all user data in a single operation.
     *
     * @returns A promise that resolves to an array of all user data
     */
    async getAll(): Promise<User[]> {
        const userIds = await this.#redsClient.smembers(this.#userSetKey);

        const pipeline = this.#redsClient.pipeline();
        userIds.forEach((userId) => pipeline.get(userId));

        const results = await pipeline.exec();

        if (results) {
            return results
                .filter(([err, data]) => !err && data != null)
                .map(([, data]) => JSON.parse(data as string)) as User[];
        }

        return [] as User[];
    }

    /**
     * Removes a user from storage.
     *
     * Uses Redis pipeline to atomically remove both the user data and
     * the user ID from the set of all user IDs.
     *
     * @param userId - The ID of the user to remove
     * @returns A promise that resolves when the user has been removed
     */
    async remove(userId: UserId): Promise<void> {
        const pipeline = this.#redsClient.pipeline();

        pipeline.del(String(userId));
        pipeline.srem(this.#userSetKey, userId);

        await pipeline.exec();
    }

    /**
     * Retrieves a user by their ID.
     *
     * @param userId - The ID of the user to retrieve
     * @returns A promise that resolves to the user data if found, or undefined if not found
     */
    async get(userId: UserId): Promise<User | undefined> {
        const stringifiedUserObj = await this.#redsClient.get(String(userId));
        if (stringifiedUserObj) {
            return JSON.parse(stringifiedUserObj) as never as User;
        }
        return undefined;
    }

    /**
     * Checks if a user with the specified ID exists.
     *
     * @param userId - The ID of the user to check
     * @returns A promise that resolves to true if the user exists, false otherwise
     */
    async has(userId: UserId): Promise<boolean> {
        return Boolean(await this.#redsClient.exists(String(userId)));
    }

    /**
     * Creates or updates a user in storage.
     *
     * Uses Redis pipeline to atomically set the user data and
     * add the user ID to the set of all user IDs.
     *
     * @param userId - The ID of the user to create or update
     * @param data - The user data to store
     * @returns A promise that resolves when the user has been created or updated
     */
    async set(userId: UserId, data: User): Promise<void> {
        const pipeline = this.#redsClient.pipeline();

        pipeline.set(String(userId), JSON.stringify(data));
        pipeline.sadd(this.#userSetKey, userId);

        await pipeline.exec();
    }
}
