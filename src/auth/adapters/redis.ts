import Redis, { type RedisOptions } from "ioredis";

import type {
    AuthStorageAdapter,
    UserId,
    UserIdentifier,
} from "~/auth/adapters/auth-storage-adapter";
import { tryCatch, TryCatchResult } from "~/utils";

export interface RedisLoggingConfig {
    enabled: boolean;
    level: "error" | "warn" | "info" | "debug";
    logger?: (
        level: string,
        message: string,
        data?: Record<string, unknown>
    ) => void;
    logConnectionEvents?: boolean;
    logTiming?: boolean;
}

interface RedisStorageAdapterOptions extends RedisOptions {
    logging?: RedisLoggingConfig;
    redisClient?: Redis;
    ttl?: Seconds;
}

type Seconds = number;

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
    readonly #defaultTTL: Seconds;

    /**
     * The Redis client instance used for data storage operations.
     */
    #redisClient: Redis;

    /**
     * The collection name used as a namespace for Redis keys.
     */
    readonly #collectionName: string;

    // TODO: Find another way to store auth user's ID instead of `redis set` since Redis has no mechanism to auto-delete set members with TTL settings
    /**
     * The Redis key used to store the set of all user IDs.
     */
    readonly #userSetKey: string;

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
        this.#userSetKey = `${this.#collectionName}:user_ids`;

        // Set up Redis connection event logging
        this.#setupConnectionLogging();
    }

    get connected() {
        return this.#redisClient.status === "ready";
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
     * Retrieves all users stored in the adapter.
     *
     * Uses Redis pipeline to efficiently fetch all user data in a single operation.
     *
     * @returns A promise that resolves to an array of all user data
     */
    async getAll() {
        return tryCatch<User[]>(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting getAll operation", {
                collection: this.#collectionName,
            });
            try {
                const userIds = await this.#redisClient.smembers(
                    this.#userSetKey
                );
                this.#log("debug", "Retrieved user IDs from set", {
                    collection: this.#collectionName,
                    userCount: userIds.length,
                });

                const pipeline = this.#redisClient.pipeline();
                userIds.forEach((userId) =>
                    pipeline.get(this.#generateUserKey(userId))
                );

                const results = await pipeline.exec();

                let users: User[] = [];
                if (results) {
                    users = results
                        .filter(([err, data]) => !err && data != null)
                        .map(([, data]) =>
                            JSON.parse(data as string)
                        ) as User[];
                }

                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "getAll operation completed", {
                    collection: this.#collectionName,
                    userCount: users.length,
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });

                return users as User[];
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "getAll operation failed", {
                    collection: this.#collectionName,
                    error:
                        error instanceof Error ? error.message : String(error),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
    }

    /**
     * Removes a user from storage.
     *
     * Uses Redis pipeline to atomically remove both the user data and
     * the user ID from the set of all user IDs.
     *
     * @param userId - The ID of the user to remove
     * @returns A promise that resolves when the user has been removed
     */
    async remove(userId: UserId) {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting remove operation", {
                collection: this.#collectionName,
                userId: String(userId),
            });
            try {
                const pipeline = this.#redisClient.pipeline();
                const userKey = this.#generateUserKey(userId);

                pipeline.del(userKey);
                pipeline.srem(this.#userSetKey, String(userId));

                const results = await pipeline.exec();
                const deleteResult = results?.[0];
                const sremResult = results?.[1];

                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "remove operation completed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    deleted: deleteResult?.[1] === 1,
                    removedFromSet: sremResult?.[1] === 1,
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
                    userId: String(userId),
                    error:
                        error instanceof Error ? error.message : String(error),
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
     * @param userId - The ID of the user to retrieve
     * @returns A promise that resolves to the user data if found, or undefined if not found
     */
    async get(userId: UserId) {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting get operation", {
                collection: this.#collectionName,
                userId: String(userId),
            });
            try {
                const storedUser = await this.#redisClient.get(
                    this.#generateUserKey(userId)
                );
                let user: User | null = null;
                if (storedUser) {
                    user = JSON.parse(storedUser) as never as User;
                }
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "get operation completed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    found: user !== null,
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                return user;
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "get operation failed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    error:
                        error instanceof Error ? error.message : String(error),
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
     * @param userId - The ID of the user to check
     * @returns A promise that resolves to true if the user exists, false otherwise
     */
    async has(userId: UserId) {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting has operation", {
                collection: this.#collectionName,
                userId: String(userId),
            });
            try {
                const exists = Boolean(
                    await this.#redisClient.exists(
                        this.#generateUserKey(userId)
                    )
                );
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "has operation completed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    exists,
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
                    userId: String(userId),
                    error:
                        error instanceof Error ? error.message : String(error),
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
     * @param userId - The ID of the user to create or update
     * @param data - The user data to store
     * @returns A promise that resolves when the user has been created or updated
     */
    async set(userId: UserId, data: User) {
        return tryCatch<User>(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting set operation", {
                collection: this.#collectionName,
                userId: String(userId),
            });
            try {
                const pipeline = this.#redisClient.pipeline();

                pipeline.setex(
                    this.#generateUserKey(userId),
                    this.#defaultTTL,
                    JSON.stringify(data)
                );
                pipeline.sadd(this.#userSetKey, String(userId));

                const results = await pipeline.exec();
                const setResult = results?.[0];
                const saddResult = results?.[1];

                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "set operation completed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    dataSet: setResult?.[1] === "OK",
                    addedToSet: saddResult?.[1] === 1,
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });

                return data;
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "set operation failed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    error:
                        error instanceof Error ? error.message : String(error),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
    }

    /**
     * Refreshes a user's session TTL without retrieving data.
     * Useful for keeping sessions alive during user activity.
     *
     * @param userId - The ID of the user whose session to refresh
     * @returns A promise that resolves to true if session was refreshed, false if user doesn't exist
     */
    async resetExpiration(userId: UserId) {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting resetExpiration operation", {
                collection: this.#collectionName,
                userId: String(userId),
            });
            try {
                const result = await this.#redisClient.expire(
                    this.#generateUserKey(userId),
                    this.#defaultTTL
                );
                const refreshed = result === 1;
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "resetExpiration operation completed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    refreshed,
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                return refreshed;
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "resetExpiration operation failed", {
                    collection: this.#collectionName,
                    userId: String(userId),
                    error:
                        error instanceof Error ? error.message : String(error),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
    }

    /**
     * Clears all users tracked by this adapter.
     *
     * Uses the user ID set to delete each user's key and then removes the set itself.
     *
     * @returns A promise that resolves to true when complete
     */
    async clear() {
        return tryCatch(async () => {
            const startTime = this.#loggingConfig.logTiming ? Date.now() : 0;
            this.#log("debug", "Starting clear operation", {
                collection: this.#collectionName,
            });
            try {
                const userIds = await this.#redisClient.smembers(
                    this.#userSetKey
                );

                const pipeline = this.#redisClient.pipeline();
                for (const userId of userIds) {
                    pipeline.del(this.#generateUserKey(userId));
                }
                // Also remove the set that tracks all user IDs
                pipeline.del(this.#userSetKey);

                await pipeline.exec();
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("info", "clear operation completed", {
                    collection: this.#collectionName,
                    userCount: userIds.length,
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                return true;
            } catch (error) {
                const duration = this.#loggingConfig.logTiming
                    ? Date.now() - startTime
                    : undefined;
                this.#log("error", "clear operation failed", {
                    collection: this.#collectionName,
                    error:
                        error instanceof Error ? error.message : String(error),
                    ...(duration !== undefined && {
                        duration: `${duration}ms`,
                    }),
                });
                throw error;
            }
        });
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

    #generateUserKey(userId: UserId) {
        return `${this.#collectionName}:${userId}`;
    }
}
