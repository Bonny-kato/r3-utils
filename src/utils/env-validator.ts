// env-validator.ts
import * as process from "node:process";
import { z } from "zod";

/**
 * Environment types
 */
export type Environment = "development" | "production" | "test";

/**
 * Configuration options for the environment validator
 */
export interface EnvValidatorOptions {
    /**
     * The node environment to check against. If not provided,
     * uses process.env.NODE_ENV
     */
    processENV?: object;

    /**
     * If true, will throw error when validation fails.
     * If false, will only log warnings. Default: true
     */
    strict?: boolean;

    /**
     * Custom logger function. Default: console.error
     */
    logger?: (message: string) => void;
}

export type EnvSchema<T = string> = z.ZodObject<Record<keyof T, z.ZodType>>;

const defaultOptions: EnvValidatorOptions = {
    processENV: process.env,
    strict: true,
    logger: console.error,
};

/**
 * Creates a validator that ensures a value exists in the specified environments
 *
 * @param environments - Array of environment names where the variable is required
 * @returns Zod refinement function
 */
export function requiredIn(
    environments: Environment[]
): z.RefinementEffect<string | undefined | boolean>["refinement"] {
    return (value, ctx) => {
        const currentEnv = process.env.NODE_ENV as Environment;
        if (environments.includes(currentEnv) && !value) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Missing required environment variable ${ctx.path.join(".")} in ${currentEnv} environment`,
            });
        }
    };
}

/**
 * Shorthand for requiring a variable in production environment
 */
export const requiredInProduction = requiredIn(["production"]);

/**
 * Shorthand for requiring a variable in development environment
 */
export const requiredInDevelopment = requiredIn(["development"]);

/**
 * Shorthand for requiring a variable in both production and development environments
 */
export const requiredInProdAndDev = requiredIn(["production", "development"]);

/**
 * Validates environment variables against a schema
 *
 * @param schema - Zod schema for environment variables
 * @param options - Configuration options
 * @returns Validated environment variables with inferred types
 */
export const validateEnv = <T extends z.ZodType>(
    schema: T,
    options: EnvValidatorOptions = {}
): z.infer<T> => {
    const mergedOptions = { ...defaultOptions, ...options };

    try {
        return schema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formatted = error.format();
            mergedOptions?.logger?.(
                `Environment validation failed: ${JSON.stringify(formatted, null, 2)}`
            );

            if (mergedOptions.strict) {
                throw error;
            }
        }
        throw error;

        // // Return partial data if not strict
        // return schema.partial().parse(options.processENV);
    }
};

type CreateEnvSchema = Record<
    string,
    {
        requiredIn?: Environment[];
        type?: "string" | "boolean" | "number";
        default?: string | boolean | number;
    }
>;

/**
 * Helper function to create a basic schema with common validation patterns
 *
 * @param envVars - Object with environment variable configurations
 * @returns Zod schema for the environment
 *
 * @example
 * ```
 * const schema = createEnvSchema({
 *   API_KEY: { requiredIn: ['production'] },
 *   DEBUG: { type: 'boolean', default: false },
 *   PORT: { type: 'number', default: 3000 }
 * });
 * ```
 */
export const createEnvSchema = <T extends CreateEnvSchema>(envVars: T) => {
    type InferredType = {
        [K in keyof T]: T[K]["type"] extends "boolean"
            ? boolean
            : T[K]["type"] extends "number"
              ? number
              : string;
    };

    const schemaObj: Record<string, z.ZodType> = {};

    for (const [key, config] of Object.entries(envVars)) {
        let schema: z.ZodType;

        // Set base type
        switch (config.type) {
            case "boolean":
                schema = z.preprocess(
                    (val) => val === "true" || val === true || val === "1",
                    z.boolean().optional()
                );
                break;
            case "number":
                schema = z
                    .preprocess((val) => Number(val), z.number())
                    .optional();
                break;
            case "string":
            default:
                schema = z.string().optional();
        }

        // Add requirements
        if (config.requiredIn && config.requiredIn.length > 0) {
            schema = schema.superRefine(requiredIn(config.requiredIn));
        }

        // Add default if provided
        if (config.default !== undefined) {
            schema = schema.default(config.default);
        }

        schemaObj[key] = schema;
    }

    return z.object(schemaObj) as z.ZodType<InferredType>;
};
