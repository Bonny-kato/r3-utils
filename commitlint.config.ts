import { UserConfig } from "@commitlint/types";


const config: UserConfig = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "contains-issue-number": [2, "always"],
    },
};

export default config;
