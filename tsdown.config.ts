import { defineConfig, UserConfig } from "tsdown";

const sharableConfig: UserConfig = {
    minify: true,
    unbundle: true,
    exports: true,
    sourcemap: true,
    external: ["node:process"],
    dts: {
        sourcemap: true,
    },
    alias: { "~/*": "./src/*" },
};

export default defineConfig([
    {
        ...sharableConfig,
        entry: [
            "src/access-control/index.ts",
            "src/cache/index.ts",
            "src/hooks/index.ts",
        ],
        platform: "browser",
    },

    {
        ...sharableConfig,
        entry: [
            "src/http-client/index.ts",
            "src/utils/index.ts",
            "src/zod-common/index.ts",
            "src/auth/index.ts",
        ],
        platform: "neutral",
    },
]);
