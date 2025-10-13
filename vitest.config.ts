import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        coverage: {
            enabled: true,
            provider: "v8",
        },
        typecheck: {
            enabled: true,
        },
        watch: true,
    },
});
