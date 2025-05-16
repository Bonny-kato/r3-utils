import SimpleDB from "@bonnykato/simple-db";
import {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "../auth-storage-adpter";
import { RedisStorageAdapter } from "./redis";

/**
 * JSON file-based implementation of the AuthStorageAdapter interface.
 *
 * This adapter uses a SimpleDB instance to store user data in a JSON file.
 * It's designed for simple applications or local development environments.
 * For production environments with higher performance requirements,
 * consider using {@link RedisStorageAdapter} instead.
 *
 * @template User - The user type that extends UserIdentifier
 */
export class JsonStorageAdapter<User extends UserIdentifier>
    implements AuthStorageAdapter<User>
{
    /**
     * The SimpleDB client instance used for data storage operations.
     * Stores user data in a file named 'db.json' in the project root.
     */
    dbClient: SimpleDB<User & { id: string }>;

    /**
     * Creates a new JsonStorageAdapter instance.
     *
     * @param collectionName - The name of the collection in the JSON file where user data will be stored
     */
    constructor(collectionName: string) {
        this.dbClient = new SimpleDB<User & { id: string }>(
            "db.json",
            collectionName
        );
    }

    /**
     * Retrieves a user by their ID.
     *
     * @param userId - The ID of the user to retrieve
     * @returns A promise that resolves to the user data if found, or undefined if not found
     */
    async get(userId: UserId): Promise<User | undefined> {
        return this.dbClient.getByID(String(userId));
    }

    /**
     * Retrieves all users stored in the adapter.
     *
     * @returns A promise that resolves to an array of all user data
     */
    getAll(): Promise<User[]> {
        return this.dbClient.getAll();
    }

    /**
     * Checks if a user with the specified ID exists.
     *
     * @param userId - The ID of the user to check
     * @returns A promise that resolves to true if the user exists, false otherwise
     */
    async has(userId: UserId): Promise<boolean> {
        return Boolean(await this.dbClient.getByID(String(userId)));
    }

    /**
     * Removes a user from storage.
     *
     * @param userId - The ID of the user to remove
     * @returns A promise that resolves when the user has been removed
     */
    async remove(userId: UserId): Promise<void> {
        await this.dbClient.delete(String(userId));
    }

    /**
     * Creates or updates a user in storage.
     *
     * @param userId - The ID of the user to create or update
     * @param data - The user data to store
     * @returns A promise that resolves when the user has been created or updated
     */
    async set(userId: UserId, data: User): Promise<void> {
        const existingUser = await this.dbClient.getByID(String(userId));

        if (existingUser) {
            await this.dbClient.delete(String(userId));
        }
        await this.dbClient.create({
            ...data,
            id: String(userId),
        });
    }
}
