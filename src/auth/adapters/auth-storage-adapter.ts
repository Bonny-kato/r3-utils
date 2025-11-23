import { TryCatchResult } from "~/utils/try-catch";

/**
 * Primitive identifier type supported by the auth module.
 * Your user object must include an `id` of this type.
 */
export type UserId = string | number;

/**
 * Minimal user shape required by the auth module. The `Auth` class is generically
 * typed with your concrete user type, as long as it includes an `id`.
 */
export type UserIdentifier = { id: UserId };

/**
 * Shape returned by storage adapters when reading/writing user session entries.
 */
export type SessionData<TUser extends UserIdentifier> = {
    /** The user payload to persist. */
    user: TUser;
    /** Optional absolute expiration timestamp for the session. */
    expires?: Date;
};

/**
 * Adapter contract for database-backed session storage.
 *
 * You provide an implementation to persist sessions in your data store.
 * See `createDbSessionStorage` and the `AuthOptions` variant with `sessionStorageType: "in-custom-db"`.
 */
export interface AuthStorageAdapter<TUser extends UserIdentifier> {
    /**
     * Check whether a session with this ID exists.
     * @param sessionId - Generated session identifier.
     * @returns A tuple-like `TryCatchResult<boolean>`: `[error, value]`.
     */
    has(sessionId: string): Promise<TryCatchResult<boolean>>;

    /**
     * Retrieve the persisted session entry for the given session ID.
     * @param sessionId - Session identifier to look up.
     * @returns `TryCatchResult<SessionData<TUser> | null>` where `null` means not found.
     */
    get(sessionId: string): Promise<TryCatchResult<SessionData<TUser> | null>>;

    /**
     * Create a new session entry for a user (or replace existing).
     * @param sessionId - New session ID to assign.
     * @param data - Full user object to persist.
     * @param expires - Optional expiration moment.
     */
    set(
        sessionId: string,
        data: TUser,
        expires?: Date
    ): Promise<TryCatchResult<SessionData<TUser>>>;

    /**
     * Apply a partial update to the existing session entry.
     * @param sessionId - Existing session ID.
     * @param data - Patch with the subset of user fields to update.
     * @param expires - Optional new expiration moment.
     */
    update(
        sessionId: string,
        data: Partial<TUser>,
        expires?: Date
    ): Promise<TryCatchResult<SessionData<TUser>>>;

    /**
     * Remove the session entry.
     * @param sessionId - Session ID to delete.
     * @returns `TryCatchResult<boolean>` where the value indicates whether a record was removed.
     */
    remove(sessionId: string): Promise<TryCatchResult<boolean>>;

    /**
     * Associate a user with the currently active session ID (used for single-session enforcement).
     */
    setUserSession(
        userId: UserId,
        sessionId: string
    ): Promise<TryCatchResult<boolean>>;

    /**
     * Get the active session ID currently associated with a user, if any.
     */
    getUserActiveSession(
        userId: UserId
    ): Promise<TryCatchResult<string | null>>;

    /**
     * Clear the active-session association for a user (e.g., on logout).
     */
    removeUserSession(userId: UserId): Promise<TryCatchResult<boolean>>;

    /**
     * Get all session IDs associated with a user.
     */
    getAllUserSessions(userId: UserId): Promise<TryCatchResult<string[]>>;

    /**
     * Add a session ID to the user's session list.
     */
    addUserSessionToList(
        userId: UserId,
        sessionId: string
    ): Promise<TryCatchResult<boolean>>;

    /**
     * Remove a session ID from the user's session list.
     */
    removeUserSessionFromList(
        userId: UserId,
        sessionId: string
    ): Promise<TryCatchResult<boolean>>;
}
