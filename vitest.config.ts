import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        typecheck: {
            enabled: true,
        },
        coverage: {
            provider: "v8",
            enabled: true,
        },
    },
});
