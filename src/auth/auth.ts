import {
    createCookieSessionStorage,
    redirect,
    Session,
    SessionIdStorageStrategy,
} from "react-router";
import { checkIsDevMode, safeRedirect, tryCatch } from "../utils";
import { JsonStorageAdapter } from "./adapters";
import {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "./auth-storage-adapter";

const defaultCookieConfig: CookieSessionStorageOptions["cookie"] = {
    httpOnly: true,
    secure: !checkIsDevMode(),
};
/**
 * Options for cookie-based session storage.
 * Borrowed from React Router source code.
 */
interface CookieSessionStorageOptions {
    /**
     * The Cookie used to store the session data on the client, or options used
     * to automatically create one.
     */
    cookie?: SessionIdStorageStrategy["cookie"];
}

/**
 * Configuration options for the Auth class.
 */
interface AuthOptions<User extends UserIdentifier> {
    storageAdapter?: AuthStorageAdapter<User>;
    collectionName?: string;
    /** Cookie configuration for session storage */
    cookie: CookieSessionStorageOptions["cookie"];

    /** Custom URL for the login page (defaults to "/login") */
    loginPageUrl?: string;
    /** Custom URL for the logout page (defaults to "/logout") */
    logoutPageUrl?: string;
}

/**
 * Authentication utility class for managing user sessions.
 *
 * Provides methods for user login, logout, session management,
 * and authentication verification.
 */
export class Auth<User extends UserIdentifier> {
    /** Session storage instance for managing cookies */
    readonly sessionStorage: ReturnType<
        typeof createCookieSessionStorage<{ userId: UserId }>
    >;
    #storageAdapter: AuthStorageAdapter<User>;
    /** URL path for the login page */
    readonly #loginPageUrl: string = "/login";
    /** URL path for the logout page */
    readonly #logoutPageUrl: string = "/logout";

    /**
     * Creates a new Auth instance.
     *
     * @param options - Configuration options for authentication
     */
    constructor(options: AuthOptions<User>) {
        this.sessionStorage = createCookieSessionStorage<{ userId: UserId }>({
            cookie: { ...defaultCookieConfig, ...options.cookie },
        });
        this.#loginPageUrl = options.loginPageUrl ?? this.#loginPageUrl;
        this.#logoutPageUrl = options.logoutPageUrl ?? this.#logoutPageUrl;

        this.#storageAdapter =
            options.storageAdapter ??
            new JsonStorageAdapter<User>(
                options?.collectionName ?? "auth_users"
            );
    }

    /**
     * Logs in a user and redirects to the specified URL.
     *
     * @param user - The authenticated user data
     * @param redirectTo - URL to redirect after successful login
     * @returns A redirect response with the session cookie
     */
    async loginAndRedirect(user: User, redirectTo: string): Promise<Response> {
        const session = await this.sessionStorage.getSession();

        session.set("userId", user.id);
        await this.#storageAdapter.set(user.id, user);

        return safeRedirect(redirectTo, {
            headers: {
                "Set-Cookie": await this.sessionStorage.commitSession(session),
            },
        });
    }

    /**
     * Updates a user's session and redirects to the specified URL.
     *
     * @param request - The current request
     * @param user - Updated user data
     * @param redirectTo - URL to redirect after session update
     * @returns A redirect response with the updated session cookie
     */
    async updateSessionAndRedirect(
        request: Request,
        user: User,
        redirectTo: string
    ): Promise<Response> {
        const session = await this.getSession(request);

        await this.sessionStorage.destroySession(session);
        await this.#storageAdapter.set(user.id, user);

        return this.loginAndRedirect(user, redirectTo);
    }

    /**
     * Retrieves the session from a request.
     *
     * @param request - The current request
     * @returns The session associated with the request
     */
    async getSession(request: Request) {
        const [error, session] = await tryCatch(
            this.sessionStorage.getSession(request.headers.get("Cookie"))
        );
        if (error) {
            throw redirect(this.#logoutPageUrl);
        }

        return session as Session<{ userId: UserId }>;
    }

    /**
     * Extracts the user ID from the session.
     *
     * @param request - The current request
     * @returns The user ID if present, null otherwise
     */
    async getUserId(request: Request): Promise<string | null> {
        const session = await this.getSession(request);
        const userId = session.get("userId") as string | undefined;

        return userId || null;
    }

    /**
     * Ensures a user is authenticated or redirects to the login page.
     *
     * @param request - The current request
     * @param redirectTo - URL to redirect to after login (defaults to the current path)
     * @returns The authenticated user data
     * @throws Redirects to login page if user is not authenticated
     */
    requireUserOrRedirect = async (
        request: Request,
        redirectTo: string = new URL(request.url).pathname
    ) => {
        const userId = await this.getUserId(request);
        const user = await this.#storageAdapter.get(userId!);

        if (!user) {
            this.#throwRedirect(redirectTo);
        }

        return user;
    };

    /**
     * Logs out the current user, clears their session, and redirects to the login page.
     *
     * @param {Request} request - The incoming client request object, containing session and user information.
     * @return {Promise<Response>} A response object containing the redirection to the login page and updated headers with the destroyed session cookie.
     */
    async logoutAndRedirect(request: Request): Promise<Response> {
        const session = await this.getSession(request);
        const userId = await this.getUserId(request);

        if (userId) {
            await this.#storageAdapter.remove(userId);
        }

        return redirect(this.#loginPageUrl, {
            headers: {
                "Set-Cookie": await this.sessionStorage.destroySession(session),
            },
        });
    }

    /**
     * Retrieves the authentication token of the current user.
     *
     * @param request - The incoming request object
     * @returns A promise that resolves to the user's authentication token
     * @throws {Error} If user is not authenticated or does not have a token
     * @throws {Response} Redirects to login page if user is not authenticated
     *
     * @remarks
     * This method expects the User type to include a token property.
     * Only use this method if you are certain the user object will contain a token,
     * otherwise it will throw an error.
     */
    async requireToken<T extends UserIdentifier & { token?: string }>(
        request: Request
    ): Promise<string> {
        const user = (await this.requireUserOrRedirect(request)) as never as T;

        if (!user.token) {
            throw new Error("User doesn't have a token");
        }

        return user.token;
    }
    // Todo: Remove this function
    /**
     * Gets the user ID if the user is authenticated, or null otherwise.
     *
     * @param request - The current request
     * @returns The user ID if authenticated, null otherwise
     */
    async getUserIdOrNull(request: Request): Promise<string | null> {
        return this.getUserId(request);
    }

    async getAuthUsers(request: Request) {
        await this.requireUserOrRedirect(request);
        return await this.#storageAdapter.getAll();
    }

    /**
     * Helper function to generate a redirect URL and throw the redirect.
     */
    #throwRedirect(redirectTo: string): never {
        const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
        throw redirect(`${this.#logoutPageUrl}?${searchParams}`);
    }
}
