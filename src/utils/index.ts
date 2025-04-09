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
import { AbbreviationVisibility, CurrencyVisibility, formatAmount } from "./format-amount";
import { generateAvatar } from "./generate-avatar";
import { getDurationFromNow } from "./get-duration-from-now";
import { getRequestFormData } from "./get-request-form-data";
import { getErrorMessage, isCustomErrorResponse, parseErrorResponse } from "./parse-error";
import { ParsedSearchParams, parseSearchParams, serializeQueryParams } from "./query-params-utils";
import { removeNullish } from "./remove-nulish";

export {
    fakeNetwork,
    serializeQueryParams,
    parseSearchParams,
    throwCustomError,
    safeRedirect,
    throwError,
    parseErrorResponse,
    isCustomErrorResponse,
    getErrorMessage,
    getDurationFromNow,
    conditionallyAddToArray,
    getRequestFormData,
    actionError,
    removeNullish,
    formatAmount,
    CurrencyVisibility,
    AbbreviationVisibility,
    validateEnv,
    requiredIn,
    requiredInProduction,
    requiredInDevelopment,
    requiredInProdAndDev,
    createEnvSchema,
    generateAvatar,
    checkIsDevMode,
};
export type { ParsedSearchParams, Environment, EnvValidatorOptions, EnvSchema };
