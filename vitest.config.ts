import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: [
            {
                plugins: [tsconfigPaths(), react()],
                test: {
                    browser: {
                        enabled: true,
                        headless: true,
                        instances: [{ browser: "chromium" }],
                        provider: playwright(),
                    },
                    include: ["**/*.browser.{test,spec}.?(c|m)[jt]s?(x)"],
                    name: "browser",
                    typecheck: {
                        enabled: true,
                    },
                },
            },
            {
                plugins: [tsconfigPaths(), react()],
                test: {
                    environment: "node",
                    //⬇️ Exclude browser-mode tests from a Node project
                    exclude: [
                        ...configDefaults.exclude,
                        "**/*.browser.{test,spec}.?(c|m)[jt]s?(x)",
                    ],
                    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
                    name: "node",
                    typecheck: {
                        enabled: true,
                    },
                },
            },
        ],
    },
});
