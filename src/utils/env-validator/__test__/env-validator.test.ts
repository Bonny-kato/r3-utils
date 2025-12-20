import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";

import { tryCatch } from "~/utils";
import {
    createEnvSchema,
    requiredInDevelopment,
    requiredInProdAndDev,
    requiredInProduction,
    validateEnv,
} from "~/utils/env-validator/env-validator";

describe("env-validator utility", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("requiredIn*", () => {
        it("throws when requiredInProduction var is missing in production", () => {
            vi.stubEnv("NODE_ENV", "production");

            const schema = z.object({
                API_KEY: z
                    .string()
                    .optional()
                    .superRefine(requiredInProduction),
            });

            type EnvType = z.infer<typeof schema>;
            type ParseError = ZodError<EnvType>;

            const [parseError, env] = tryCatch<EnvType, ParseError>(() =>
                schema.parse({})
            );

            const formattedError = parseError?.format();

            expect(env).toBe(null);
            expect.soft(formattedError).toHaveProperty("API_KEY");
            expect(formattedError?.API_KEY?._errors[0]).toBe(
                `Missing required environment variable API_KEY in production environment`
            );
        });

        it("does not throw when requiredInProduction var is missing in development", () => {
            vi.stubEnv("NODE_ENV", "development");

            const schema = z.object({
                API_KEY: z
                    .string()
                    .optional()
                    .superRefine(requiredInProduction),
            });

            expect(() => validateEnv(schema)).not.toThrowError();
            const result = validateEnv(schema);
            expect(result?.API_KEY).toBeUndefined();
        });

        it("requiredInDevelopment does not enforce in production", () => {
            vi.stubEnv("NODE_ENV", "production");

            const schema = z.object({
                DEV_ONLY: z
                    .string()
                    .optional()
                    .superRefine(requiredInDevelopment),
            });

            const result = validateEnv(schema);
            expect(result.DEV_ONLY).toBeUndefined();
        });

        it("requiredInProdAndDev enforces in both production and development", () => {
            const schema = z.object({
                COMMON: z.string().optional().superRefine(requiredInProdAndDev),
            });
            vi.stubEnv("NODE_ENV", "development");
            expect(() => validateEnv(schema)).toThrowError(z.ZodError);

            vi.stubEnv("NODE_ENV", "production");
            expect(() => validateEnv(schema)).toThrowError(z.ZodError);

            vi.stubEnv("NODE_ENV", "test");

            const result = validateEnv(schema);
            expect(result.COMMON).toBeUndefined();
        });
    });

    describe("validateEnv", () => {
        it("parses values from process.env using provided schema", () => {
            vi.stubEnv("NODE_ENV", "development");
            vi.stubEnv("APP_NAME", "my-app");

            const schema = z.object({
                APP_NAME: z.string(),
            });

            const result = validateEnv(schema);
            expect(result.APP_NAME).toBe("my-app");
            expect(typeof result.APP_NAME).toBe("string");
        });

        it("should call passed error-logger function if provided with array of zod error", () => {
            vi.stubEnv("NODE_ENV", "development");

            const schema = z.object({
                REQUIRED: z.string(),
            });

            const logger = vi.fn();
            validateEnv(schema, { errorLogger: logger });

            expect(logger).toHaveBeenCalledTimes(1);
            expect(logger.mock.calls[0][0]).toBeInstanceOf(z.ZodError);
        });
    });

    describe("createEnvSchema", () => {
        it("coerces boolean and number types and applies defaults", () => {
            vi.stubEnv("NODE_ENV", "development");
            vi.stubEnv("ENABLE_FEATURE", "true");
            vi.stubEnv("PORT", "3001");
            vi.stubEnv("APP_NAME", "demo");

            const schema = createEnvSchema({
                APP_NAME: { type: "string" },
                ENABLE_FEATURE: { type: "boolean" },
                PORT: { type: "number" },
            });

            const result = validateEnv(schema);

            expect(result.ENABLE_FEATURE).toBe(true); // "true" -> true
            expect(result.PORT).toBe(3001); // "3001" -> 3001
            expect(result.APP_NAME).toBe("demo"); // string preserved
        });

        it('enforces "requiredIn" when specified in schema builder', () => {
            vi.stubEnv("NODE_ENV", "production");

            const schema = createEnvSchema({
                API_KEY: { requiredIn: ["production"], type: "string" },
            });

            expect(() => validateEnv(schema)).toThrowError(z.ZodError);
        });

        it("handles boolean truthy variants", () => {
            vi.stubEnv("NODE_ENV", "development");
            vi.stubEnv("FLAG_TRUE_1", "1");
            vi.stubEnv("FLAG_TRUE_TRUE", "true");

            const schema = createEnvSchema({
                FLAG_TRUE_1: { type: "boolean" },
                FLAG_TRUE_TRUE: { type: "boolean" },
            });

            const result = validateEnv(schema);
            expect(result.FLAG_TRUE_1).toBe(true);
            expect(result.FLAG_TRUE_TRUE).toBe(true);
        });

        it("should not throw error when default value is provided env the value is not presented in env", () => {
            vi.stubEnv("NODE_ENV", "development");

            const schema = createEnvSchema({
                TEST_VAR: { default: "default-value", type: "string" },
            });

            const result = validateEnv(schema);
            expect(result.TEST_VAR).toBe("default-value");
        });

        it("should not throw error when a boolean default value is provided and the variable it requires in production but is not present in env", () => {
            vi.stubEnv("NODE_ENV", "production");

            const schema = createEnvSchema({
                AUTH_USE_LOCAL_IMPLEMENTATION: {
                    default: false,
                    requiredIn: ["production"],
                    type: "boolean",
                },
            });

            const result = validateEnv(schema);
            expect(result.AUTH_USE_LOCAL_IMPLEMENTATION).toBe(false);
        });

        it("should not throw error when a number default value is provided and the variable it requires in production but is not present in env", () => {
            vi.stubEnv("NODE_ENV", "production");
            const DEFAULT_PORT = 3000;

            const schema = createEnvSchema({
                PORT_NUMBER: {
                    default: DEFAULT_PORT,
                    requiredIn: ["production"],
                    type: "number",
                },
            });

            const result = validateEnv(schema);
            expect(result.PORT_NUMBER).toBe(DEFAULT_PORT);
        });

        it("should not throw error when a string default value is provided and the variable it requires in production but is not present in env", () => {
            vi.stubEnv("NODE_ENV", "production");

            const DEFAULT_SECRET_KEY = "33893u8u3h3993939j3993";

            const schema = createEnvSchema({
                SECRET_KEY: {
                    default: DEFAULT_SECRET_KEY,
                    requiredIn: ["production"],
                    type: "string",
                },
            });

            const result = validateEnv(schema);
            expect(result.SECRET_KEY).toBe(DEFAULT_SECRET_KEY);
        });

        it("should not throw error when default value is provided and the variable it requires in develop but is not present in env", () => {
            vi.stubEnv("NODE_ENV", "development");

            const schema = createEnvSchema({
                DEV_VAR: {
                    default: "dev-default",
                    requiredIn: ["development"],
                    type: "string",
                },
            });

            const result = validateEnv(schema);
            expect(result.DEV_VAR).toBe("dev-default");
        });
    });
});
