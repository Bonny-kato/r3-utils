/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { builtinModules } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
        typecheck: {
            enabled: true,
        },
        coverage: {
            provider: "v8",
            enabled: false,
        },
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        lib: {
            entry: {
                auth: resolve(__dirname, "src/auth/index.ts"),
                cache: resolve(__dirname, "src/cache/index.ts"),
                "access-control": resolve(
                    __dirname,
                    "src/access-control/index.ts"
                ),
                hooks: resolve(__dirname, "src/hooks/index.ts"),
                "http-client": resolve(__dirname, "src/http-client/index.ts"),
                utils: resolve(__dirname, "src/utils/index.ts"),
                "zod-common": resolve(__dirname, "src/zod-common/index.ts"),
                constants: resolve(__dirname, "src/constants/index.ts"),
            },
            formats: ["es"],
        },
        rollupOptions: {
            // Mark all dependencies, peer dependencies, and Node.js built-in modules as external
            external: [
                "react",
                "react-dom",
                "react-router",
                "@bonnykato/simple-db",
                "axios",
                "dayjs",
                "@bonny-kato/localstorage",
                "zod",
                "ioredis",
                "./src/constants.ts",
                "node:process",
                "react-hook-form",
                "./constants",
                "remix-toast",
                // Add regex patterns to catch all variations of these packages
                /^dayjs($|\/)/,
                /^react($|\/)/,
                /^react-dom($|\/)/,
                /^react-router($|\/)/,
                ...builtinModules,
            ],
            output: {
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: (chunkInfo) => {
                    return chunkInfo.name.includes("/")
                        ? "[name].js"
                        : "[name]/index.js";
                },
                // Ensure external dependencies are correctly referenced
                globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                    "react-router": "ReactRouter",
                },
                // Ensure proper external module resolution
                format: "es",
            },
        },
    },
});
