/// <reference types="vite/client" />

import * as process from "node:process";

/**
 * Checks if the current environment is a development environment.
 *
 * @deprecated This utility is unreliable when used in packages due to build-time environment variable replacement.
 * Instead of using this as a package dependency, copy this utility directly into your project files.
 *
 * The issue: Vite replaces `import.meta.env.DEV` at build time, not runtime. When this code is bundled into a package,
 * the value gets "frozen" based on the environment when the package was built, not when it's used.
 *
 * @returns {boolean} True if in development mode, false otherwise
 */
export const checkIsDevMode = (): boolean => {
    // Check Node.js environment
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV) {
        return process.env.NODE_ENV === "development";
    }

    // Check Vite environment
    if (typeof import.meta !== "undefined" && import.meta.env) {
        return import.meta.env.DEV;
    }

    // Fallback for unknown environments
    return false;
};

/**
 * IMPORTANT: How to use this correctly
 * --------------------------------------
 *
 * 1. DO NOT use this utility as an imported package in browser environments
 * 2. Instead, copy this utility directly into your project's source code
 * 3. This ensures Vite can properly replace the env variables at YOUR app's build time
 *
 * When bundled as a package:
 * - The `import.meta.env.DEV` value gets replaced during the PACKAGE build
 * - This means it's fixed to whatever environment was used when building the package
 * - Later, when used in your app, the value doesn't change based on your app's environment
 *
 * When copied directly to your project:
 * - Vite correctly replaces the values during YOUR application build
 * - The environment detection works as expected
 */
