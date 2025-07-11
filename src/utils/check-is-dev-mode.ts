import * as process from "node:process";

/**
 * Checks if the current environment is a development environment by examining
 * the NODE_ENV environment variable. This is used throughout the application
 * to enable development-only features like logging, debugging, and validation.
 *
 * @returns {boolean} True if NODE_ENV is set to "development", false otherwise
 * or if NODE_ENV is not defined
 */
export const checkIsDevMode = (): boolean => {
    // Check Node.js environment
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV) {
        return process.env.NODE_ENV === "development";
    }
    
    // Fallback for unknown environments
    return false;
};