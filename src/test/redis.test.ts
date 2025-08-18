import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import Redis from "ioredis";

// Mock Redis to avoid requiring an actual Redis instance for most tests
vi.mock("ioredis", () => {
    const mockRedis = {
        on: vi.fn(),
        set: vi.fn(),
        get: vi.fn(),
        del: vi.fn(),
        exists: vi.fn(),
        disconnect: vi.fn(),
        ping: vi.fn(),
    };
    
    const RedisMock = vi.fn(() => mockRedis);
    RedisMock.prototype = mockRedis;
    
    return {
        default: RedisMock,
    };
});

describe("Redis Basic Functionality", () => {
    let redis: Redis;
    let mockRedis: any;

    beforeAll(() => {
        redis = new Redis();
        mockRedis = redis as any;
    });

    afterAll(async () => {
        await redis.disconnect();
    });

    describe("Redis Connection", () => {
        it("should create Redis instance", () => {
            expect(redis).toBeDefined();
            expect(Redis).toHaveBeenCalled();
        });

        it("should register error event listener", () => {
            expect(mockRedis.on).toHaveBeenCalledWith("error", expect.any(Function));
        });

        it("should handle connection errors gracefully", () => {
            const errorHandler = mockRedis.on.mock.calls.find(
                call => call[0] === "error"
            )?.[1];
            
            const consoleSpy = vi.spyOn(console, "log").mockImplementation();
            const testError = new Error("Connection failed");
            
            errorHandler(testError);
            
            expect(consoleSpy).toHaveBeenCalledWith("[REDIS ERROR]", testError);
            consoleSpy.mockRestore();
        });
    });

    describe("Redis Operations", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should set key-value with NX and XX flags", async () => {
            mockRedis.set.mockResolvedValue("OK");
            
            const result = await redis.set("k", "v", "NX", "XX");
            
            expect(mockRedis.set).toHaveBeenCalledWith("k", "v", "NX", "XX");
            expect(result).toBe("OK");
        });

        it("should return null when key doesn't exist with NX flag", async () => {
            mockRedis.set.mockResolvedValue(null);
            
            const result = await redis.set("existing-key", "value", "NX", "XX");
            
            expect(mockRedis.set).toHaveBeenCalledWith("existing-key", "value", "NX", "XX");
            expect(result).toBeNull();
        });

        it("should handle Redis errors during set operations", async () => {
            const error = new Error("Redis connection lost");
            mockRedis.set.mockRejectedValue(error);
            
            const consoleSpy = vi.spyOn(console, "log").mockImplementation();
            
            try {
                await redis.set("k", "v", "NX", "XX");
            } catch (err) {
                expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", error.message);
            }
            
            consoleSpy.mockRestore();
        });

        it("should get value by key", async () => {
            mockRedis.get.mockResolvedValue("test-value");
            
            const result = await redis.get("test-key");
            
            expect(mockRedis.get).toHaveBeenCalledWith("test-key");
            expect(result).toBe("test-value");
        });

        it("should return null when key doesn't exist", async () => {
            mockRedis.get.mockResolvedValue(null);
            
            const result = await redis.get("non-existent-key");
            
            expect(mockRedis.get).toHaveBeenCalledWith("non-existent-key");
            expect(result).toBeNull();
        });

        it("should delete key", async () => {
            mockRedis.del.mockResolvedValue(1);
            
            const result = await redis.del("key-to-delete");
            
            expect(mockRedis.del).toHaveBeenCalledWith("key-to-delete");
            expect(result).toBe(1);
        });

        it("should check if key exists", async () => {
            mockRedis.exists.mockResolvedValue(1);
            
            const result = await redis.exists("existing-key");
            
            expect(mockRedis.exists).toHaveBeenCalledWith("existing-key");
            expect(result).toBe(1);
        });

        it("should ping Redis server", async () => {
            mockRedis.ping.mockResolvedValue("PONG");
            
            const result = await redis.ping();
            
            expect(mockRedis.ping).toHaveBeenCalled();
            expect(result).toBe("PONG");
        });
    });

    describe("Redis Playground Function", () => {
        it("should execute redis playground successfully", async () => {
            mockRedis.set.mockResolvedValue("OK");
            const consoleSpy = vi.spyOn(console, "log").mockImplementation();
            
            // Import and execute the playground function
            const { redisPlayground } = await import("~/redis");
            await redisPlayground();
            
            expect(mockRedis.set).toHaveBeenCalledWith("k", "v", "NX", "XX");
            expect(consoleSpy).toHaveBeenCalledWith("OK");
            
            consoleSpy.mockRestore();
        });

        it("should handle playground function errors", async () => {
            const error = new Error("Redis operation failed");
            mockRedis.set.mockRejectedValue(error);
            const consoleSpy = vi.spyOn(console, "log").mockImplementation();
            
            // Import and execute the playground function
            const { redisPlayground } = await import("~/redis");
            await redisPlayground();
            
            expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", error.message);
            
            consoleSpy.mockRestore();
        });
    });

    describe("Redis Connection Configuration", () => {
        it("should accept custom Redis options", () => {
            const customOptions = {
                host: "localhost",
                port: 6379,
                password: "secret",
                db: 1,
            };
            
            const customRedis = new Redis(customOptions);
            
            expect(Redis).toHaveBeenCalledWith(customOptions);
            expect(customRedis).toBeDefined();
        });

        it("should handle connection timeouts", async () => {
            const timeoutError = new Error("Connection timeout");
            mockRedis.ping.mockRejectedValue(timeoutError);
            
            await expect(redis.ping()).rejects.toThrow("Connection timeout");
        });
    });

    describe("Redis Data Types and Operations", () => {
        it("should handle string operations", async () => {
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue("test-string");
            
            await redis.set("string-key", "test-string");
            const value = await redis.get("string-key");
            
            expect(value).toBe("test-string");
        });

        it("should handle JSON data", async () => {
            const jsonData = { id: 1, name: "John", active: true };
            const jsonString = JSON.stringify(jsonData);
            
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue(jsonString);
            
            await redis.set("json-key", jsonString);
            const retrieved = await redis.get("json-key");
            
            expect(JSON.parse(retrieved!)).toEqual(jsonData);
        });

        it("should handle numeric values", async () => {
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue("42");
            
            await redis.set("number-key", "42");
            const value = await redis.get("number-key");
            
            expect(parseInt(value!)).toBe(42);
        });

        it("should handle boolean values as strings", async () => {
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue("true");
            
            await redis.set("bool-key", "true");
            const value = await redis.get("bool-key");
            
            expect(value === "true").toBe(true);
        });
    });

    describe("Error Handling and Edge Cases", () => {
        it("should handle null and undefined values", async () => {
            mockRedis.get.mockResolvedValue(null);
            
            const result = await redis.get("null-key");
            
            expect(result).toBeNull();
        });

        it("should handle empty string values", async () => {
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue("");
            
            await redis.set("empty-key", "");
            const value = await redis.get("empty-key");
            
            expect(value).toBe("");
        });

        it("should handle special characters in keys and values", async () => {
            const specialKey = "key:with:special:chars";
            const specialValue = "value with spaces and symbols !@#$%^&*()";
            
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue(specialValue);
            
            await redis.set(specialKey, specialValue);
            const value = await redis.get(specialKey);
            
            expect(mockRedis.set).toHaveBeenCalledWith(specialKey, specialValue);
            expect(value).toBe(specialValue);
        });

        it("should handle very long keys and values", async () => {
            const longKey = "a".repeat(1000);
            const longValue = "b".repeat(10000);
            
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue(longValue);
            
            await redis.set(longKey, longValue);
            const value = await redis.get(longKey);
            
            expect(mockRedis.set).toHaveBeenCalledWith(longKey, longValue);
            expect(value).toBe(longValue);
        });
    });
});

// Integration tests that would run against a real Redis instance
// These tests should be gated behind an environment variable
describe("Redis Integration Tests", () => {
    const shouldRunIntegrationTests = process.env.REDIS_INTEGRATION_TESTS === "true";
    
    if (!shouldRunIntegrationTests) {
        it.skip("Integration tests skipped - set REDIS_INTEGRATION_TESTS=true to enable", () => {});
        return;
    }

    let realRedis: Redis;

    beforeAll(() => {
        // Unmock Redis for integration tests
        vi.doUnmock("ioredis");
        const RedisReal = require("ioredis").default;
        realRedis = new RedisReal({
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            db: parseInt(process.env.REDIS_TEST_DB || "15"), // Use a test database
        });
    });

    afterAll(async () => {
        if (realRedis) {
            await realRedis.flushdb(); // Clean up test data
            await realRedis.disconnect();
        }
    });

    it("should perform real Redis operations", async () => {
        const testKey = `test:${Date.now()}`;
        const testValue = "integration-test-value";

        // Set value
        const setResult = await realRedis.set(testKey, testValue);
        expect(setResult).toBe("OK");

        // Get value
        const getValue = await realRedis.get(testKey);
        expect(getValue).toBe(testValue);

        // Check existence
        const exists = await realRedis.exists(testKey);
        expect(exists).toBe(1);

        // Delete key
        const delResult = await realRedis.del(testKey);
        expect(delResult).toBe(1);

        // Verify deletion
        const deletedValue = await realRedis.get(testKey);
        expect(deletedValue).toBeNull();
    });

    it("should handle NX and XX flags correctly", async () => {
        const testKey = `test:flags:${Date.now()}`;
        const value1 = "first-value";
        const value2 = "second-value";

        // NX flag - set only if key doesn't exist
        const nxResult1 = await realRedis.set(testKey, value1, "NX");
        expect(nxResult1).toBe("OK");

        // NX flag - should fail as key exists
        const nxResult2 = await realRedis.set(testKey, value2, "NX");
        expect(nxResult2).toBeNull();

        // XX flag - should succeed as key exists
        const xxResult = await realRedis.set(testKey, value2, "XX");
        expect(xxResult).toBe("OK");

        // Verify final value
        const finalValue = await realRedis.get(testKey);
        expect(finalValue).toBe(value2);

        // Clean up
        await realRedis.del(testKey);
    });
});