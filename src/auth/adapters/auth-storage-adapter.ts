import { TryCatchResult } from "~/utils/try-catch";

export type UserId = string | number;
export type UserIdentifier = { id: UserId };

export type SessionData<TUser extends UserIdentifier> = {
    user: TUser;
    expires?: Date;
};

export interface AuthStorageAdapter<TUser extends UserIdentifier> {
    /**
     * Check whether a user with this ID exists.
     */
    has(sessionId: string): Promise<TryCatchResult<boolean>>;

    /**
     * Retrieve user details by user ID.
     */
    get(sessionId: string): Promise<TryCatchResult<SessionData<TUser> | null>>;

    /**
     * Create or update a user entry with associated data.
     */
    set(
        sessionId: string,
        data: TUser,
        expires?: Date
    ): Promise<TryCatchResult<SessionData<TUser>>>;

    /**
     * Update existing user entry with partial data.
     */
    update(
        sessionId: string,
        data: Partial<TUser>,
        expires?: Date
    ): Promise<TryCatchResult<SessionData<TUser>>>;

    /**
     * Remove user entry from storage (session logout or session destroy).
     */
    remove(sessionId: string): Promise<TryCatchResult<boolean>>;

    setUserSession(
        userId: UserId,
        sessionId: string
    ): Promise<TryCatchResult<boolean>>;

    getUserActiveSession(
        userId: UserId
    ): Promise<TryCatchResult<string | null>>;

    removeUserSession(userId: UserId): Promise<TryCatchResult<boolean>>;
}
