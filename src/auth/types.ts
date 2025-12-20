import { CookieParseOptions, CookieSerializeOptions } from "react-router";
import {
    AuthStorageAdapter,
    UserIdentifier,
} from "~/auth/adapters/auth-storage-adapter";

/**
 * Cookie configuration used by the session storage.
 *
 * Combines `CookieParseOptions` and `CookieSerializeOptions` from `react-router`,
 * plus a required `name` and an array of `secrets` used to sign/verify cookies.
 *
 * Example
 * ```ts
 * const cookie: CookieStorageOptions = {
 *   name: "__session",
 *   secrets: [process.env.SESSION_SECRET!],
 *   path: "/",
 *   httpOnly: true,
 *   sameSite: "lax",
 *   secure: process.env.NODE_ENV === "production",
 *   maxAge: 60 * 60 * 24 * 7 // 7 days
 * };
 * ```
 */
export type CookieStorageOptions = CookieParseOptions &
    CookieSerializeOptions & { name: string; secrets: Array<string> };

/**
 * Options common to all storage strategies.
 */
interface CommonAuthOptions {
    /** Cookie configuration for session storage. */
    cookie: CookieStorageOptions;

    /** Custom URL for the login page (defaults to "/login"). */
    loginPageUrl?: string;
}

/**
 * Configure custom database-backed session storage using an adapter you provide.
 *
 * @typeParam User - Your user shape, which must at least include an `id` field.
 */
interface InCustomDdStorageOptions<User extends UserIdentifier>
    extends CommonAuthOptions {
    /**
     * If `true`, a user can only have a single active session at a time.
     * When a new session is created, any existing session for the same user is invalidated.
     */
    enableSingleSession?: boolean;
    /** Configure custom database-backed session storage using an adapter you provide. */
    sessionStorageType: "in-custom-db";
    /** Implementation that persists/fetches sessions from your data store. */
    storageAdapter: AuthStorageAdapter<User>;
}

/**
 * Configure cookie-only session storage (no external persistence).
 */
interface InCookieOnlyStorageOptions extends CommonAuthOptions {
    /** Configure cookie-only session storage (no external persistence). */
    sessionStorageType?: "in-cookie-only";
}

/**
 * Configure in-memory session storage (primarily for testing).
 */
interface InMemoryStorageOptions extends CommonAuthOptions {
    /** Configure in-memory session storage (primarily for testing) */
    sessionStorageType?: "in-memory";
}

/**
 * Use the default strategy (currently cookie-only) when the discriminator is omitted.
 */
interface DefaultStorageOptions extends CommonAuthOptions {
    sessionStorageType?: undefined;
}

/**
 * Configuration options for the `Auth` class.
 *
 * Choose one of several storage strategies:
 * - custom DB (`in-custom-db`) via an `AuthStorageAdapter`
 * - cookie-only (`in-cookie-only`)
 * - in-memory (`in-memory`)
 * - default (currently cookie-only)
 *
 * Example – use a custom DB adapter
 * ```ts
 * import { Auth } from "~/auth/auth";
 * import { type AuthOptions } from "~/auth/types";
 * import { myAdapter } from "./my-adapter";
 *
 * type AppUser = { id: string; email: string; role?: "user"|"admin" };
 *
 * const options: AuthOptions<AppUser> = {
 *   sessionStorageType: "in-custom-db",
 *   storageAdapter: myAdapter,
 *   cookie: { name: "__session", secrets: [env.SECRET!], path: "/", sameSite: "lax" },
 *   loginPageUrl: "/signin",
 *   logoutPageUrl: "/signout",
 * };
 *
 * const auth = new Auth<AppUser>(options);
 * ```
 *
 * Example – cookie-only (no adapter)
 * ```ts
 * import { Auth } from "~/auth/auth";
 * import { type AuthOptions } from "~/auth/types";
 *
 * type AppUser = { id: number; email: string };
 *
 * const options: AuthOptions<AppUser> = {
 *   sessionStorageType: "in-cookie-only",
 *   cookie: { name: "__session", secrets: [env.SECRET!], path: "/" }
 * };
 *
 * const auth = new Auth<AppUser>(options);
 * ```
 */
export type AuthOptions<User extends UserIdentifier> =
    | InCustomDdStorageOptions<User>
    | InCookieOnlyStorageOptions
    | InMemoryStorageOptions
    | DefaultStorageOptions;
