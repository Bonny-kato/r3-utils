export type UserId = string | number;
export type UserIdentifier = { id: UserId; token?: string };

export interface AuthStorageAdapter<User extends UserIdentifier> {
    /**
     * Check whether a user with this ID exists.
     */
    has(userId: UserId): Promise<boolean>;

    /**
     * Retrieve user details by user ID.
     */
    get(userId: UserId): Promise<User | undefined>;

    /**
     * Create or update a user entry with associated data.
     */
    set(userId: UserId, data: User): Promise<void>;

    /**
     * Remove user entry from storage (session logout or session destroy).
     */
    remove(userId: UserId): Promise<void>;

    /**
     * List all AuthUser entries (optional, useful for administration/logging).
     */
    getAll(): Promise<User[]>;
}
