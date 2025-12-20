import { redirect, SessionStorage } from "react-router";
import { UserIdentifier } from "~/auth/adapters/auth-storage-adapter";
import {
    createAuthStorage,
    DbSessionStorageError,
} from "~/auth/create-db-session-storage";
import { AuthOptions } from "~/auth/types";
import {
    HTTP_FOUND,
    HTTP_INTERNAL_SERVER_ERROR,
} from "~/http-client/status-code";
import { safeRedirect, throwError, tryCatch, typedKeys } from "~/utils";
import { isNotEmpty } from "~/utils/is-not-empty";

/**
 * Authentication utility for managing user sessions.
 *
 * Provides helpers for login, logout, session updates, and guards that enforce authentication.
 *
 * @typeParam User - Your application user type; must include an `id` field.
 *
 *
 * Example
 * ```ts
 * import { Auth } from "~/auth/auth";
 * import type { AuthOptions } from "~/auth/types";
 *
 * type AppUser = { id: string; email: string };
 *
 * const auth = new Auth<AppUser>({
 *   cookie: { name: "__session", secrets: [env.SECRET!], path: "/" }
 * });
 *
 * // In an action/loader:
 * const isAuthed = await auth.isAuthenticated(request);
 * ```
 */
export class Auth<User extends UserIdentifier> {
    /** Session storage instance for managing cookies */
    readonly sessionStorage: SessionStorage<User, User>;
    /** URL path for the login page */
    readonly #loginPageUrl: string = "/login";

    /**
     * Create a new `Auth` instance.
     *
     * @param options - Auth configuration including cookie settings and storage strategy.
     */
    constructor(options: AuthOptions<User>) {
        this.sessionStorage = createAuthStorage(options);
        this.#loginPageUrl = options.loginPageUrl ?? this.#loginPageUrl;
    }

    /**
     * Log in a user, persist their data in the session, and redirect.
     *
     * @param user - The authenticated user data to store in the session.
     * @param redirectTo - Absolute or relative URL to redirect after login.
     * @returns A redirect `Response` with the `Set-Cookie` header applied.
     *
     * Example
     * ```ts
     * const user = { id: "u_1", email: "a@b.c" } as const;
     * return auth.loginAndRedirect(user, "/dashboard");
     * ```
     */
    async loginAndRedirect(user: User, redirectTo: string): Promise<Response> {
        const session = await this.sessionStorage.getSession();

        const userProps = typedKeys(user);
        for (const prop of userProps) {
            session.set(prop, user[prop]);
        }
        return safeRedirect(redirectTo, {
            headers: {
                "Set-Cookie": await this.sessionStorage.commitSession(session),
            },
        });
    }

    /**
     * Update the current session with the latest user fields without redirecting.
     *
     * @param request - The incoming request containing the current session cookie.
     * @param user - The updated user object; its fields will be merged into the session.
     * @returns `ResponseInit` with a `Set-Cookie` header; spread this into your own response.
     *
     * Example
     * ```ts
     * // In an action: update profile then refresh cookie
     * const updated = await updateUserFromForm(request);
     * const headers = await auth.updateSession(request, updated); // ResponseInit
     * return json({ ok: true }, headers);
     * ```
     */
    async updateSession(request: Request, user: User): Promise<ResponseInit>;
    /**
     * Update the session and redirect in a single step.
     *
     * @param request - The incoming request containing the current session cookie.
     * @param user - The updated user object; its fields will be merged into the session.
     * @param redirectTo - Where to redirect after the session cookie has been updated.
     * @returns A redirect `Response` with the `Set-Cookie` header.
     *
     * Example
     * ```ts
     * // After changing the user's role, redirect to their dashboard with fresh cookie
     * const updated = await makeUserAdmin(request);
     * return auth.updateSession(request, updated, "/dashboard");
     * ```
     */
    async updateSession(
        request: Request,
        user: User,
        redirectTo: string
    ): Promise<Response>;
    /**
     * Implementation for the `updateSession` overloads. When `redirectTo` is provided,
     * updates the session and returns a redirect `Response`; otherwise returns `ResponseInit`
     * with `Set-Cookie` headers you can spread into your own response.
     *
     * @throws Redirects to the login page when no valid session exists or the session was invalidated.
     */
    async updateSession(
        request: Request,
        user: User,
        redirectTo?: string
    ): Promise<Response | ResponseInit> {
        const session = await this.#getSession(request);

        if (!session) {
            return this.#throwRedirectToLoginPage(
                request,
                redirectTo ?? new URL(request.url).pathname
            );
        }

        const userProps = typedKeys(user);
        for (const prop of userProps) {
            session.set(prop, user[prop]);
        }

        const responseHeaders = {
            headers: {
                "Set-Cookie": await this.sessionStorage.commitSession(session),
            },
        };

        if (redirectTo) {
            return safeRedirect(redirectTo, responseHeaders);
        }

        return responseHeaders;
    }

    /**
     * Determine whether the incoming request has an authenticated session.
     *
     * @param request - The incoming request containing the session cookie.
     * @returns `true` when a valid user `id` is present in the session; otherwise `false`.
     */
    async isAuthenticated(request: Request): Promise<boolean> {
        const session = await this.#getSession(request);
        const id = session?.get?.("id");
        return typeof id === "string" || typeof id === "number";
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
        const session = await this.#getSession(request);

        if (isNotEmpty(session?.data)) {
            return session.data as never as User;
        }

        return this.#throwRedirectToLoginPage(request, redirectTo);
    };

    /**
     * Logs out the current user, clears their session, and redirects to the specified URL.
     *
     * @param {Request} request - The incoming client request object, containing session and user information.
     * @param {string} [redirectUrl] - Optional URL to redirect to after logout. If not provided, redirects to the login page.
     * @returns {Promise<Response>} A response object containing the redirection and updated headers with the destroyed session cookie.
     */
    async logoutAndRedirect(
        request: Request,
        redirectUrl?: string
    ): Promise<Response> {
        const headers = await this.#clearSession(request);
        return redirect(redirectUrl ?? this.#loginPageUrl, headers);
    }

    async #getSession(request: Request) {
        const [error, session] = await tryCatch(
            this.sessionStorage.getSession(request.headers.get("Cookie"))
        );

        if (error instanceof DbSessionStorageError) {
            if (error.status === HTTP_FOUND) {
                const redirectTo = new URL(request.url).pathname;

                return this.#throwRedirectToLoginPage(
                    request,
                    redirectTo,
                    error.message
                );
            }
            return throwError({
                message: error.message,
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
        }

        return session;
    }

    #clearSession = async (request: Request) => {
        const [err, session] = await tryCatch(
            this.sessionStorage.getSession(request.headers.get("Cookie"))
        );
        // If we cannot get a session, default to a blank one so we can set a past-dated cookie safely.
        const safeSession =
            err || !session ? await this.sessionStorage.getSession() : session;
        return {
            headers: {
                "Set-Cookie":
                    await this.sessionStorage.destroySession(safeSession),
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
            console.error(message);
        }
        const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);

        throw redirect(`${this.#loginPageUrl}?${searchParams}`, headers);
    }
}
