import { TryCatchResult } from "~/utils/try-catch";

export type UserId = string | number;
export type UserIdentifier = { id: UserId };

export interface AuthStorageAdapter<TUser extends UserIdentifier> {
    /**
     * Check whether a user with this ID exists.
     */
    has(userId: UserId): Promise<TryCatchResult<boolean>>;

    /**
     * Retrieve user details by user ID.
     */
    get(userId: UserId): Promise<TryCatchResult<TUser | null>>;

    /**
     * Create or update a user entry with associated data.
     */
    set(userId: UserId, data: TUser): Promise<TryCatchResult<TUser>>;

    /**
     * Remove user entry from storage (session logout or session destroy).
     */
    remove(userId: UserId): Promise<TryCatchResult<boolean>>;

    /**
     * List all AuthUser entries (optional, useful for administration/logging).
     */
    getAll(): Promise<TryCatchResult<TUser[]>>;

    resetExpiration(userId: UserId): Promise<TryCatchResult<boolean>>;
}
