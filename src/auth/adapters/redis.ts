import Redis, { type RedisOptions } from "ioredis";

import {
    AuthStorageAdapter,
    SessionData,
    UserIdentifier,
} from "~/auth/adapters/auth-storage-adapter";
import { tryCatch, TryCatchResult } from "~/utils";

export interface RedisLoggingConfig {
    enabled: boolean;
    level: "error" | "warn" | "info" | "debug";
    logConnectionEvents?: boolean;
    logTiming?: boolean;
    logger?: (
        level: string,
        message: string,
        data?: Record<string, unknown>
    ) => void;
}

/**
 * Configuration options for Redis storage adapter
 * Extends Redis client options with additional configuration specific to the storage adapter
 */
interface RedisStorageAdapterOptions extends RedisOptions {
    /** Redis logging configuration options */
    logging?: RedisLoggingConfig;
    /** Optional pre-configured Redis client instance to use */
    redisClient?: Redis;
    /**
     * Time-to-live in seconds for session data
     * Takes precedence over cookie maxAge and is used as default when expiration is not set
     */
    ttl?: number;
}

const DEFAULT_TTL = 600; // 10 minutes

/**
 * Redis-based implementation of the AuthStorageAdapter interface.
 *
 * This adapter uses Redis for high-performance storage of user data.
 * It's designed for production environments with high traffic or when
 * scaling across multiple servers. User data is stored as JSON strings
 * in Redis, with a set to track all user IDs.
 *
 * @template User - The user type that extends UserIdentifier
 */
export class RedisStorageAdapter<User extends UserIdentifier>
    implements AuthStorageAdapter<User>
{
    /**
     * Default TTL for user sessions in seconds (10 minutes)
     */

    // oxlint-disable-next-line no-unused-private-class-members (false positive error 'defaultTTL' is defined but never used)
    readonly #defaultTTL: number;

    /**
     * The Redis client instance used for data storage operations.
     */
    #redisClient: Redis;

    /**
     * The collection name used as a namespace for Redis keys.
     */
    readonly #collectionName: string;

    /**
     * Logging configuration for the adapter.
     */
    readonly #loggingConfig: RedisLoggingConfig;

    /**
     * Creates a new RedisStorageAdapter instance.
     *
     * @param collectionName - The name of the collection to use as a namespace for Redis keys
     * @param option - Optional Redis connection options
     */
    constructor(collectionName: string, option?: RedisStorageAdapterOptions) {
        const { redisClient, ttl, logging, ...otherOptions } = option ?? {};

        this.#defaultTTL = ttl ?? DEFAULT_TTL;

        this.#collectionName = collectionName;

        // Initialize logging configuration with defaults
        this.#loggingConfig = {
            enabled: false,
            level: "info",
            logConnectionEvents: true,
            logTiming: false,
            ...logging,
        };

        // Create Redis client without logging field
        this.#redisClient =
            redisClient ??
            new Redis({
                ...otherOptions,
            });

        // Set up Redis connection event logging
        this.#setupConnectionLogging();
    }

    get connected() {
        return this.#redisClient.status === "ready";
    }

    update(sessionId: string, data: Partial<User>, expires?: Date) {
        return tryCatch(async () => {
            const [error, sessionData] = await this.get(sessionId);
            if (error) throw error;
            if (!sessionData)
                throw new Error(`User with session id ${sessionId} not found`);

            const updatedUser = {
                ...sessionData.user,
                ...data,
            };

            const [err, result] = await this.set(
                sessionId,
                updatedUser,
                expires
            );
            if (err) throw err;
            return result;
        });
    }

    setUserSession(
        userId: string,
        sessionId: string
    ): Promise<TryCatchResult<boolean>> {
        return tryCatch(async () => {
            const result = await this.#redisClient.set(
                `user_session:${userId}`,
                sessionId
            );
            return result === "OK";
        });
    }

    getUserActiveSession(
        userId: string
    ): Promise<TryCatchResult<string | null>> {
        return tryCatch(async () => {
            return this.#redisClient.get(`user_session:${userId}`);
        });
    }

    removeUserSession(userId: string): Promise<TryCatchResult<boolean>> {
        return tryCatch(async () => {
            const result = await this.#redisClient.del(
                `user_session:${userId}`
            );
            return result === 1; // one means okay;
        });
    }

    /**
     * Removes a user from storage.
     *
     * Uses Redis pipeline to atomically remove both the user data and
     * the user ID from the set of all user IDs.
     *
     * @param sessionId - The ID of the user to remove
     * @returns A promise that resolves when the user has been removed
     */
    async remove(sessionId: string) {
        console.log("[remove:]", sessionId);

        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting remove operation", {
                collection: this.#collectionName,
                userId: String(sessionId),
            });
            try {
                const userKey = this.generateSessionDataIdentifier(sessionId);
                const result = await this.#redisClient.del(userKey);

                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;

                this.#log("info", "remove operation completed", {
                    collection: this.#collectionName,
                    deleted: result === 1,
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });

                return true;
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "remove operation failed", {
                    collection: this.#collectionName,
                    error:
                        error instanceof Error ? error.message : String(error),
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
    }

    /**
     * Retrieves a user by their ID.
     *
     * @param sessionId - The ID of the user to retrieve
     * @returns A promise that resolves to the user data if found, or undefined if not found
     */
    async get(sessionId: string) {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting get operation", {
                collection: this.#collectionName,
                userId: String(sessionId),
            });
            try {
                const storedUserSession = await this.#redisClient.get(
                    this.generateSessionDataIdentifier(sessionId)
                );

                if (!storedUserSession) return null;

                const sessionData = JSON.parse(storedUserSession) as never as {
                    user: User;
                    expires: string;
                };

                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "get operation completed", {
                    collection: this.#collectionName,
                    found: sessionData !== null,
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });

                return {
                    expires: sessionData?.expires
                        ? new Date(sessionData?.expires)
                        : undefined,
                    user: sessionData.user,
                };
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "get operation failed", {
                    collection: this.#collectionName,
                    error:
                        error instanceof Error ? error.message : String(error),
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
    }

    /**
     * Checks if a user with the specified ID exists.
     *
     * @param sessionId - The ID of the user to check
     * @returns A promise that resolves to true if the user exists, false otherwise
     */
    async has(sessionId: string) {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting has operation", {
                collection: this.#collectionName,
                userId: String(sessionId),
            });
            try {
                const exists = Boolean(
                    await this.#redisClient.exists(
                        this.generateSessionDataIdentifier(sessionId)
                    )
                );
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "has operation completed", {
                    collection: this.#collectionName,
                    exists,
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                return exists;
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "has operation failed", {
                    collection: this.#collectionName,
                    error:
                        error instanceof Error ? error.message : String(error),
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
    }

    /**
     * Creates or updates a user in storage.
     *
     * Uses Redis pipeline to atomically set the user data and
     * add the user ID to the set of all user IDs.
     *
     * @param sessionId - The ID of the user to create or update
     * @param data - The user data to store
     * @param expires
     * @returns A promise that resolves when the user has been created or updated
     */

    async set(sessionId: string, data: User, expires?: Date) {
        const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
        this.#log("debug", "Starting set operation", {
            collection: this.#collectionName,
            userId: String(sessionId),
        });
        // console.log("[]", this.#defaultTTL);

        const [error, sessionData] = await tryCatch<SessionData<User>>(
            async () => {
                const serializedSessionData = JSON.stringify({
                    expires,
                    user: data,
                });

                const ttl = expires
                    ? Math.floor(expires.getTime() / 1000)
                    : this.#defaultTTL;

                // const ttl = this.#defaultTTL;

                const result = await this.#redisClient.setex(
                    this.generateSessionDataIdentifier(sessionId),
                    ttl,
                    serializedSessionData
                );

                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;

                this.#log("info", "set operation completed", {
                    collection: this.#collectionName,
                    dataSet: result === "OK",
                    userId: String(sessionId),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });

                return { expires, user: data };
            }
        );

        if (error) {
            const duration = this.#loggingConfig.logTiming
                ? Date.now() - startTime
                : undefined;
            this.#log("error", "set operation failed", {
                collection: this.#collectionName,
                error: String(error),
                userId: String(sessionId),
                ...(duration !== undefined && {
                    duration: `${duration}ms`,
                }),
            });
        }

        return [error, sessionData] as TryCatchResult<SessionData<User>>;
    }

    generateSessionDataIdentifier(sessionId: string) {
        return `${this.#collectionName}:${sessionId}`;
    }

    /**
     * Logs a message if logging is enabled and the log level is appropriate.
     */
    #log(
        level: "error" | "warn" | "info" | "debug",
        message: string,
        data?: Record<string, unknown>
    ): void {
        if (!this.#loggingConfig.enabled) return;

        const levels = ["error", "warn", "info", "debug"] as const;
        const currentLevelIndex = levels.indexOf(
            this.#loggingConfig.level as (typeof levels)[number]
        );
        const messageLevelIndex = levels.indexOf(level);

        if (messageLevelIndex <= currentLevelIndex) {
            if (this.#loggingConfig.logger) {
                this.#loggingConfig.logger(level, message, data);
            } else {
                const tagged = `[RedisStorageAdapter:${level.toUpperCase()}] ${message}`;
                switch (level) {
                    case "error":
                        if (data) console.error(tagged, data);
                        else console.error(tagged);
                        break;
                    case "warn":
                        if (data) console.warn(tagged, data);
                        else console.warn(tagged);
                        break;
                    case "info":
                        if (data) console.info(tagged, data);
                        else console.info(tagged);
                        break;
                    case "debug":
                        if (data) {
                            if (typeof console.debug === "function")
                                console.debug(tagged, data);
                            else console.log(tagged, data);
                        } else {
                            if (typeof console.debug === "function")
                                console.debug(tagged);
                            else console.log(tagged);
                        }
                        break;
                    default:
                        if (data) console.log(tagged, data);
                        else console.log(tagged);
                }
            }
        }
    }

    /**
     * Sets up logging for Redis connection events.
     */
    #setupConnectionLogging(): void {
        if (
            !this.#loggingConfig.enabled ||
            !this.#loggingConfig.logConnectionEvents
        )
            return;

        this.#redisClient.on("connect", () => {
            this.#log("info", "Redis connection established", {
                collection: this.#collectionName,
            });
        });

        this.#redisClient.on("ready", () => {
            this.#log("info", "Redis client ready", {
                collection: this.#collectionName,
            });
        });

        this.#redisClient.on("error", (error: Error) => {
            this.#log("error", "Redis connection error", {
                collection: this.#collectionName,
                error: error.message,
                stack: error.stack,
            });
        });

        this.#redisClient.on("close", () => {
            this.#log("warn", "Redis connection closed", {
                collection: this.#collectionName,
            });
        });

        this.#redisClient.on("reconnecting", () => {
            this.#log("info", "Redis reconnecting", {
                collection: this.#collectionName,
            });
        });

        this.#redisClient.on("end", () => {
            this.#log("warn", "Redis connection ended", {
                collection: this.#collectionName,
            });
        });
    }
}
