/// <reference types="vite/client" />

import * as process from "node:process";

/**
 * Checks if the current environment is a development environment.
 *
 * @returns {boolean} True if in development mode, false otherwise
 */
export const checkIsDevMode = (): boolean => {
    if (typeof process !== "undefined" && process.env?.NODE_ENV) {
        return process.env?.NODE_ENV === "development";
    }
    if (typeof import.meta.env !== "undefined") {
        return import.meta.env.DEV;
    }
    return false; // Fallback for unknown environments
};
