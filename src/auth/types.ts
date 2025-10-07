import { Cookie, CookieOptions } from "react-router";
import {
    AuthStorageAdapter,
    UserIdentifier,
} from "~/auth/adapters/auth-storage-adapter";

export type CookieStorageOptions = Cookie | (CookieOptions & { name: string });

interface CommonAuthOptions {
    /** Cookie configuration for session storage */
    cookie: CookieStorageOptions;

    /** Custom URL for the login page (defaults to "/login") */
    loginPageUrl?: string;
    /** Custom URL for the logout page (defaults to "/logout") */
    logoutPageUrl?: string;
}

export type DbSessionStorageOptions = {
    enableSingleSession?: boolean;
};

interface InCustomDdStorageOptions<User extends UserIdentifier>
    extends CommonAuthOptions,
        DbSessionStorageOptions {
    sessionStorageType: "in-custom-db";
    storageAdapter: AuthStorageAdapter<User>;
}

interface InCookieOnlyStorageOptions extends CommonAuthOptions {
    sessionStorageType: "in-cookie-only";
}

interface InMemoryStorageOptions extends CommonAuthOptions {
    sessionStorageType: "in-memory";
}

/**
 * Configuration options for the Auth class.
 */
export type AuthOptions<User extends UserIdentifier> =
    | InCustomDdStorageOptions<User>
    | InCookieOnlyStorageOptions
    | InMemoryStorageOptions;
