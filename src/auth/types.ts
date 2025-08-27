import {
    createCookieSessionStorage,
    createMemorySessionStorage,
} from "react-router";
import {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "~/auth/auth-storage-adapter";

export type Overwrite<T, U extends Partial<{ [K in keyof T]: unknown }>> = Omit<
    T,
    keyof U
> &
    U;

type SessionStorageOptions = NonNullable<
    Parameters<typeof createCookieSessionStorage>[0]
>;

export type CookieStorageOptions = SessionStorageOptions["cookie"] & {
    secrets: Array<string>;
};

/**
 * Configuration options for the Auth class.
 */
export interface AuthOptions<
    User extends UserIdentifier,
    Mode extends AuthMode = AuthMode,
> {
    storageAdapter?: AuthStorageAdapter<User>;
    collectionName?: string;
    /** Cookie configuration for session storage */
    cookie: Overwrite<CookieStorageOptions, { name: string }>;

    /** Custom URL for the login page (defaults to "/login") */
    loginPageUrl?: string;
    /** Custom URL for the logout page (defaults to "/logout") */
    logoutPageUrl?: string;
    mode?: Mode;
}

export type AuthMode = "test" | "default";

export type SessionStorage<Mode extends AuthMode> = Mode extends "test"
    ? ReturnType<typeof createMemorySessionStorage<{ userId: UserId }>>
    : ReturnType<typeof createCookieSessionStorage<{ userId: UserId }>>;
