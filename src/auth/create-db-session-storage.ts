import {
    CookieSerializeOptions,
    createCookieSessionStorage,
    createMemorySessionStorage,
    createSessionStorage,
    FlashSessionData,
    SessionStorage,
} from "react-router";
import { AuthStorageAdapter, UserIdentifier, } from "~/auth/adapters/auth-storage-adapter";
import { AuthOptions, CookieStorageOptions, DbSessionStorageOptions, } from "~/auth/types";
import { HTTP_FOUND, HTTP_INTERNAL_SERVER_ERROR } from "~/http-client";
import { throwError } from "~/utils";

const generateSessionId = (): string => {
    const array = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
    );
};

export class DbSessionStorageError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);

        this.name = "DbSessionStorageError";
        this.status = status;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DbSessionStorageError);
        }
    }
}

export const createDbSessionStorage = <User extends UserIdentifier>(
    storageAdapter: AuthStorageAdapter<User>,
    cookie: CookieStorageOptions,
    options: DbSessionStorageOptions
) => {
    return createSessionStorage<User>({
        deleteData: async (id: string) => {
            // 1️⃣ Get user before removing session
            const [, data] = await storageAdapter.get(id);

            // 2️⃣ Remove user session
            const [error] = await storageAdapter.remove(id);
            if (error) {
                throwError({
                    message: error?.message,
                    status: HTTP_INTERNAL_SERVER_ERROR,
                });
            }

            // 3️⃣ Also remove the user-session mapping
            if (data?.user) {
                await storageAdapter.removeUserSession(data.user.id);
            }
        },

        readData: async (sessionId: string) => {
            // 1️⃣ Retrieve user data associated with the sessionId if exist else return null
            const [error, sessionData] = await storageAdapter.get(sessionId);

            if (error) {
                throw new DbSessionStorageError(
                    error.message,
                    HTTP_INTERNAL_SERVER_ERROR
                );
            }

            // 2️⃣ Check if the session is expired
            if (sessionData?.expires && sessionData.expires < new Date()) {
                await storageAdapter.remove(sessionId);
                return null;
            }

            if (!sessionData?.user) {
                return null;
            }

            if (options.enableSingleSession) {
                /* 3️⃣ Verify this session is still the active one for this user
               If the active session doesn't match, the user was logged in elsewhere
               throw error to invalidate the session */

                const [getUserSessionError, activeSessionId] =
                    await storageAdapter.getUserActiveSession(
                        sessionData.user.id
                    );

                if (getUserSessionError) {
                    throw new DbSessionStorageError(
                        getUserSessionError.message,
                        HTTP_INTERNAL_SERVER_ERROR
                    );
                }

                if (activeSessionId !== sessionId) {
                    await storageAdapter.remove(sessionId);

                    throw new DbSessionStorageError(
                        "Your session was terminated because you already an active session somewhere else",
                        HTTP_FOUND
                    );
                }
            }

            return sessionData.user as unknown as FlashSessionData<
                User,
                User
            > | null;
        },

        updateData: async (id, data, expires) => {
            const [error] = await storageAdapter.update(id, data, expires);

            if (error) {
                return throwError({
                    message: error.message,
                    status: HTTP_INTERNAL_SERVER_ERROR,
                });
            }
        },
        cookie: cookie,
        createData: async (data, expires) => {
            if (!data) {
                throw new Error("User data is required");
            }

            const user = data as never as User;
            if (options?.enableSingleSession) {
                // 1️⃣ Check if a user has an existing active session
                const [getUserSessionError, existingSessionId] =
                    await storageAdapter.getUserActiveSession(user.id);

                if (getUserSessionError) {
                    return throwError({
                        message: getUserSessionError.message,
                        status: HTTP_INTERNAL_SERVER_ERROR,
                    });
                }

                // 2️⃣If they do, invalidate the old session
                if (existingSessionId) {
                    // Todo: handle error there
                    await storageAdapter.remove(existingSessionId);
                    await storageAdapter.removeUserSession(user.id);
                }
            }

            // 3️⃣ Generate a new session &  store session data
            const sessionId = generateSessionId();

            const [error, storedUser] = await storageAdapter.set(
                sessionId,
                user,
                expires
            );

            if (error || !storedUser) {
                return throwError({
                    message: error?.message ?? "Unable to set user session",
                    status: HTTP_INTERNAL_SERVER_ERROR,
                });
            }

            if (options.enableSingleSession) {
                // 5️⃣ Link this session to the user
                const [setUserSessionError] =
                    await storageAdapter.setUserSession(user.id, sessionId);

                if (setUserSessionError) {
                    await storageAdapter.remove(sessionId);
                    return throwError({
                        message: setUserSessionError.message,
                        status: HTTP_INTERNAL_SERVER_ERROR,
                    });
                }
            }
            return sessionId;
        },
    });
};

// ----------------------------------------------------------------------

const defaultCookieOptions: CookieSerializeOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
};

export const createAuthStorage = <User extends UserIdentifier>(
    options: AuthOptions<User>
) => {
    // Validate cookie name existence
    if (!options?.cookie?.name?.trim()) {
        throwError({
            message: "Cookie name is required",
            status: HTTP_INTERNAL_SERVER_ERROR,
        });
    }

    // Validate cookie secrets existence
    if (!options?.cookie?.secrets?.length) {
        throwError({
            message: "Cookie secrets are required",
            status: HTTP_INTERNAL_SERVER_ERROR,
        });
    }
    let sessionStorage: SessionStorage<User, User>;

    const cookie = {
        ...defaultCookieOptions,
        ...options.cookie,
    };

    switch (options.sessionStorageType) {
        case "in-memory":
            sessionStorage = createMemorySessionStorage<User>({
                cookie,
            });
            break;
        case "in-cookie-only":
            sessionStorage = createCookieSessionStorage<User>({
                cookie,
            });
            break;

        case "in-custom-db":
            if (!options.storageAdapter) {
                return throwError({
                    message:
                        "Storage adapter is required when using in-custom-db mode",
                    status: HTTP_INTERNAL_SERVER_ERROR,
                });
            }
            sessionStorage = createDbSessionStorage(
                options.storageAdapter,
                cookie,
                {
                    enableSingleSession: options.enableSingleSession,
                }
            );

            break;
        default:
            return throwError({
                message:
                    "Invalid storage type. Must be one of: 'in-memory', 'in-cookie-only', 'in-custom-db.'",
                status: HTTP_INTERNAL_SERVER_ERROR,
            });
    }

    return sessionStorage;
};
