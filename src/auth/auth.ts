import {
    createCookieSessionStorage,
    createMemorySessionStorage,
    redirect,
    Session,
} from "react-router";
import {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "~/auth/auth-storage-adapter";
import {
    AuthMode,
    AuthOptions,
    CookieStorageOptions,
    SessionStorage,
} from "~/auth/types";
import {
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_UNAUTHORIZED,
} from "~/http-client/status-code";
import { checkIsDevMode, safeRedirect, throwError, tryCatch } from "~/utils";
import { JsonStorageAdapter } from "./adapters";

const defaultCookieConfig: CookieStorageOptions = {
    httpOnly: true,
    name: "__session",
    secrets: ["my-really-secret"],
    path: "/",
    sameSite: "lax",
    secure: !checkIsDevMode(),
};

// ----------------------------------------------------------------------

/**
 * Authentication utility class for managing user sessions.
 *
 * Provides methods for user login, logout, session management,
 * and authentication verification.
 */
export class Auth<
    User extends UserIdentifier,
    Mode extends AuthMode = AuthMode,
> {
    /** Session storage instance for managing cookies */
    readonly sessionStorage: SessionStorage<Mode>;
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
    constructor({
        cookie,
        loginPageUrl,
        logoutPageUrl,
        storageAdapter,
        collectionName,
        mode,
    }: AuthOptions<User, Mode>) {
        if (!cookie?.name) {
            throwError({
                message: "Cookie name is required",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        const createSessionStorage =
            mode === "test"
                ? createMemorySessionStorage
                : createCookieSessionStorage;

        this.sessionStorage = createSessionStorage<{
            userId: UserId;
        }>({
            cookie: { ...defaultCookieConfig, ...cookie },
        });

        this.#loginPageUrl = loginPageUrl ?? this.#loginPageUrl;
        this.#logoutPageUrl = logoutPageUrl ?? this.#logoutPageUrl;

        this.#storageAdapter =
            storageAdapter ??
            new JsonStorageAdapter<User>(collectionName ?? "auth_users");
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
        const [error, storedUser] = await this.#storageAdapter.set(
            user.id,
            user
        );

        if (error || !storedUser) {
            return throwError({
                message: error?.message ?? "Unable to set user session",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        return safeRedirect(redirectTo, {
            headers: {
                "Set-Cookie": await this.sessionStorage.commitSession(session),
            },
        });
    }

    async updateSession(request: Request, user: User): Promise<ResponseInit>;
    async updateSession(
        request: Request,
        user: User,
        redirectTo: string
    ): Promise<Response>;
    async updateSession(
        request: Request,
        user: User,
        redirectTo?: string
    ): Promise<Response | ResponseInit> {
        const session = await this.#getSession(request);

        const [error, updatedUser] = await this.#storageAdapter.set(
            user.id,
            user
        );
        if (error) {
            return throwError({
                message: error?.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        await this.sessionStorage.destroySession(session);

        if (redirectTo) {
            return this.loginAndRedirect(updatedUser, redirectTo);
        }

        return {
            headers: {
                "Set-Cookie": await this.sessionStorage.commitSession(session),
            },
        };
    }

    /**
     * Extracts the user ID from the session.
     *
     * @param request - The current request
     * @returns The user ID if present, null otherwise
     */
    async getUserId(request: Request): Promise<string | null> {
        const session = await this.#getSession(request);
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
    ): Promise<User> => {
        const userId = await this.getUserId(request);

        if (!userId) {
            return (await this.#throwRedirectToLoginPage(
                request,
                redirectTo,
                "User Id is missing"
                //😑 I know, am cheating at list for now
            )) as never as User;
        }

        const [error, user] = await this.#storageAdapter.get(userId!);

        if (error) {
            return throwError({
                message: error.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        if (!user) {
            return this.#throwRedirectToLoginPage(
                request,
                redirectTo,
                `User with id "${userId}" dose not found`
                // 😑 here again
            ) as never as User;
        }

        const [resetExpError, result] =
            await this.#storageAdapter.resetExpiration(user.id);

        if (resetExpError || !result) {
            return throwError({
                message:
                    resetExpError?.message || "Unable to reset user session",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        return user;
    };

    /**
     * Logs out the current user, clears their session, and redirects to the specified URL.
     *
     * @param {Request} request - The incoming client request object, containing session and user information.
     * @param {string} [redirectUrl] - Optional URL to redirect to after logout. If not provided, redirects to the login page.
     * @return {Promise<Response>} A response object containing the redirection and updated headers with the destroyed session cookie.
     */
    async logoutAndRedirect(
        request: Request,
        redirectUrl?: string
    ): Promise<Response> {
        const headers = await this.#clearSession(request);
        return redirect(redirectUrl ?? this.#loginPageUrl, headers);
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
    async requireAccessToken<T extends UserIdentifier & { token?: string }>(
        request: Request
    ): Promise<string> {
        const user = (await this.requireUserOrRedirect(request)) as never as T;

        if (!user.token) {
            return throwError({
                message: "Authenticated user lacks the required token property",
                status: HTTP_UNAUTHORIZED,
            });
        }

        return user.token;
    }

    async getAuthUsers(request: Request) {
        await this.requireUserOrRedirect(request);
        const [error, users] = await this.#storageAdapter.getAll();
        if (error) {
            throwError({
                message: error.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        return users;
    }

    #clearSession = async (request: Request) => {
        const session = await this.#getSession(request);
        const userId = session.get("userId") as string | undefined;

        if (userId) {
            const [error] = await this.#storageAdapter.remove(userId);
            if (error) {
                return throwError({
                    message: error?.message,
                    status: HTTP_INTERNAL_SERVER_ERROR,
                });
            }
        }

        return {
            headers: {
                "Set-Cookie": await this.sessionStorage.destroySession(session),
            },
        };
    };

    /**
     * Retrieves the session from a request.
     *
     * @param request - The current request
     * @returns The session associated with the request
     */
    async #getSession(request: Request) {
        const [error, session] = await tryCatch(
            this.sessionStorage.getSession(request.headers.get("Cookie"))
        );

        if (error) {
            throwError({
                message: error.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        return session as Session<{ userId: UserId }>;
    }

    /**
     * Helper function to generate a redirect URL and throw the redirect.
     */
    async #throwRedirectToLoginPage(
        request: Request,
        redirectTo: string,
        message?: string
    ) {
        //⬇️ Just to be sure we clear the session before redirecting
        const headers = await this.#clearSession(request);

        if (message) {
            console.warn(message);
        }
        const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);

        console.log("[this.#loginPageUrl]", this.#loginPageUrl);

        throw redirect(`${this.#loginPageUrl}?${searchParams}`, headers);
    }
}
