import { defineConfig } from "tsdown";
import type { UserConfig } from "tsdown";

const sharableConfig: UserConfig = {
    alias: { "~/*": "./src/*" },
    deps: {
        neverBundle: ["node:process"],
    },
    dts: {
        sourcemap: true,
    },
    minify: true,
    sourcemap: true,
    unbundle: true,
};

export default defineConfig([
    {
        ...sharableConfig,
        entry: [
            "src/access-control/index.ts",
            "src/cache/index.ts",
            "src/hooks/index.ts",
            "src/http-client/index.ts",
            "src/utils/index.ts",
            "src/zod-common/index.ts",
            "src/auth/index.ts",
        ],
        platform: "neutral",
    },
]);
