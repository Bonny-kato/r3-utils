import {
    createCookieSessionStorage,
    createMemorySessionStorage,
    redirect,
} from "react-router";
import {
    AuthStorageAdapter,
    UserIdentifier,
} from "~/auth/adapters/auth-storage-adapter";
import {
    AuthMode,
    AuthOptions,
    CookieStorageOptions,
    GetSessionReturnType,
    SessionStorage,
    SessionStorageDataType,
} from "~/auth/types";
import {
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_UNAUTHORIZED,
} from "~/http-client/status-code";
import { safeRedirect, throwError, tryCatch } from "~/utils";
import { JsonStorageAdapter } from "./adapters";

const defaultCookieConfig = {
    httpOnly: true,
    name: "__r3-utils-session",
    path: "/",
    sameSite: "lax",
    secure: true,
} as CookieStorageOptions;

// ----------------------------------------------------------------------
/**
 * Generates a cryptographically secure random session ID
 */
const generateSessionId = (): string => {
    const array = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
    );
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
        // Validate cookie name existence
        if (!cookie?.name?.trim()) {
            throwError({
                message: "Cookie name is required",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        // Validate cookie secrets existence
        if (!cookie?.secrets?.length) {
            throwError({
                message: "Cookie secrets are required",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        const createSessionStorage =
            mode === "test"
                ? createMemorySessionStorage
                : createCookieSessionStorage;

        this.sessionStorage = createSessionStorage<SessionStorageDataType>({
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

        // 1️⃣ Check if a user has an existing active session
        const [getUserSessionError, existingSessionId] =
            await this.#storageAdapter.getUserActiveSession(user.id);

        if (getUserSessionError) {
            return throwError({
                message: getUserSessionError.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        // 2️⃣If they do, invalidate the old session
        if (existingSessionId) {
            // Todo: handle error there
            await this.#storageAdapter.remove(existingSessionId);
            await this.#storageAdapter.removeUserSession(user.id);
        }

        // 3️⃣ Generate a new session &  store session data
        const sessionId = generateSessionId();
        session.set("sessionId", sessionId);

        const [error, storedUser] = await this.#storageAdapter.set(
            sessionId,
            user
        );

        if (error || !storedUser) {
            return throwError({
                message: error?.message ?? "Unable to set user session",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        // 5️⃣ Link this session to the user
        const [setUserSessionError] = await this.#storageAdapter.setUserSession(
            user.id,
            sessionId
        );

        if (setUserSessionError) {
            await this.#storageAdapter.remove(sessionId);
            return throwError({
                message: setUserSessionError.message,
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
        const [currentSessionId, session] = await this.#getSession(request);

        if (!currentSessionId) {
            return throwError({
                message: "Session ID is missing",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        // remove existing session's data
        const [removeSessionDataError, result] =
            await this.#storageAdapter.remove(currentSessionId);
        if (!result && removeSessionDataError) {
            return throwError({
                message: removeSessionDataError?.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        await this.sessionStorage.destroySession(session);

        if (redirectTo) {
            return this.loginAndRedirect(user, redirectTo);
        }

        // Generate new session id & update session data
        const newSessionId = generateSessionId();
        session.set("sessionId", newSessionId);

        const [error] = await this.#storageAdapter.set(newSessionId, user);
        if (error) {
            return throwError({
                message: error.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        return {
            headers: {
                "Set-Cookie": await this.sessionStorage.commitSession(session),
            },
        };
    }

    async isAuthenticated(request: Request): Promise<boolean> {
        const [sessionId] = await this.#getSession(request);
        return !!sessionId;
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
        // 1️⃣ Retrieve user data associated with the sessionId if exist else throw internal server error
        const [sessionId] = await this.#getSession(request);

        if (!sessionId) {
            return await this.#throwRedirectToLoginPage(
                request,
                redirectTo,
                "You are not authenticated"
            );
        }

        const [error, user] = await this.#storageAdapter.get(sessionId);

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
                `User with session ID ${sessionId} not found`
            );
        }

        // ----------------------------------------------------------------------

        // 2️⃣ Verify this session is still the active one for this user
        // If the active session doesn't match, user was logged in elsewhere
        // Clean up this invalid session
        const [getUserSessionError, activeSessionId] =
            await this.#storageAdapter.getUserActiveSession(user.id);

        if (getUserSessionError) {
            return throwError({
                message: getUserSessionError.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        if (activeSessionId !== sessionId) {
            await this.#storageAdapter.remove(sessionId);
            return this.#throwRedirectToLoginPage(
                request,
                redirectTo,
                "Your session was terminated because you logged in from another device"
            );
        }

        // ----------------------------------------------------------------------

        const [resetExpError] =
            await this.#storageAdapter.resetExpiration(sessionId);

        if (resetExpError) {
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

        if (!user?.token) {
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

    async #getSession(
        request: Request
    ): Promise<[string | null, GetSessionReturnType]> {
        const [error, session] = await tryCatch(
            this.sessionStorage.getSession(request.headers.get("Cookie"))
        );

        if (error) {
            return throwError({
                message: error.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        const sessionId = session.get("sessionId") as string | null;

        return [sessionId, session];
    }

    #clearSession = async (request: Request) => {
        const [sessionId, session] = await this.#getSession(request);

        if (sessionId) {
            // 1️⃣ Get user before removing session
            const [, user] = await this.#storageAdapter.get(sessionId);

            // 2️⃣ Remove user session
            const [error] = await this.#storageAdapter.remove(sessionId);
            if (error) {
                return throwError({
                    message: error?.message,
                    status: HTTP_INTERNAL_SERVER_ERROR,
                });
            }

            // 3️⃣ Also remove the user-session mapping
            if (user) {
                await this.#storageAdapter.removeUserSession(user.id);
            }
        }

        return {
            headers: {
                "Set-Cookie": await this.sessionStorage.destroySession(session),
            },
        };
    };

    /**
     * Helper function to generate a redirect URL and throw the redirect.
     */
    async #throwRedirectToLoginPage(
        request: Request,
        redirectTo: string,
        message?: string
    ): Promise<never> {
        //⬇️ Just to be sure we clear the session before redirecting
        const headers = await this.#clearSession(request);

        if (message) {
            // console.warn(message);
        }
        const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);

        // console.log("[this.#loginPageUrl]", this.#loginPageUrl);

        throw redirect(`${this.#loginPageUrl}?${searchParams}`, headers);
    }
}
