import { defineConfig, UserConfig } from "tsdown";

const sharableConfig: UserConfig = {
    alias: { "~/*": "./src/*" },
    dts: {
        sourcemap: true,
    },
    external: ["node:process"],
    minify: false,
    sourcemap: true,
    treeshake: false,
    unbundle: true,
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
