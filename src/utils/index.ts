// Import and re-export specific functions and types for better tree shaking
import { actionError } from "./action-error";
import { checkIsDevMode } from "./check-is-dev-mode";
import { conditionallyAddToArray } from "./conditionally-add-to-array";
import {
    createEnvSchema,
    type Environment,
    type EnvSchema,
    type EnvValidatorOptions,
    requiredIn,
    requiredInDevelopment,
    requiredInProdAndDev,
    requiredInProduction,
    validateEnv,
} from "./env-validator";
import { safeRedirect, throwCustomError, throwError } from "./error-utils";
import { fakeNetwork } from "./fake-nerwork";
import { formatAmount } from "./format-amount";
import { generateAvatar } from "./generate-avatar";
import { getDurationFromNow } from "./get-duration-from-now";
import {
    getErrorMessage,
    isCustomErrorResponse,
    parseErrorResponse,
} from "./parse-error";
import { parseRequestData } from "./parse-request-data";
import {
    ParsedSearchParams,
    parseSearchParams,
    serializeQueryParams,
} from "./query-params-utils";
import { removeNullish } from "./remove-nulish";
import { tryCatch } from "./try-catch";

export {
    actionError,
    checkIsDevMode,
    conditionallyAddToArray,
    createEnvSchema,
    fakeNetwork,
    formatAmount,
    generateAvatar,
    getDurationFromNow,
    getErrorMessage,
    isCustomErrorResponse,
    parseErrorResponse,
    parseRequestData,
    parseSearchParams,
    removeNullish,
    requiredIn,
    requiredInDevelopment,
    requiredInProdAndDev,
    requiredInProduction,
    safeRedirect,
    serializeQueryParams,
    throwCustomError,
    throwError,
    tryCatch,
    validateEnv,
};
export type { Environment, EnvSchema, EnvValidatorOptions, ParsedSearchParams };
