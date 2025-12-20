import { ZodError, ZodSchema } from "zod";
import { HTTP_NOT_ACCEPTABLE } from "~/http-client";
import { checkIsDevMode } from "./check-is-dev-mode";
import { throwError } from "./error-utils";

type FormDataError<T> = Partial<Record<keyof T, string>>;
type ValidateData<T> = {
    data: T;
    errors: Partial<Record<keyof T, string>> | null;
};

/**
 * Validates the given data against the provided schema.
 * @template TData - The type of data.
 * @param {TData} data - The data to be validated.
 * @param {ZodSchema} schema - The schema to validate against.
 * @returns {ValidateData} - An object containing the validated data and any validation errors.
 */
const validateData = <TData = unknown>(
    data: TData,
    schema: ZodSchema
): ValidateData<TData> => {
    try {
        const validData = schema.parse(data) as TData;
        return { data: validData, errors: null };
    } catch (e) {
        const errors = e as ZodError;
        return {
            data,
            errors: errors?.issues?.reduce(
                (acc: FormDataError<TData>, curr) => {
                    const key = curr.path[0] as keyof TData;
                    acc[key] = curr.message;
                    return acc;
                },
                {}
            ),
        };
    }
};

// Todo improve typing , return only none nullish values
/**
 * Removes nullish values from the input.
 *
 * @param {T} input - The input value that may contain nullish values.
 * @returns {T} - The input value with nullish values removed.
 */

export const removeNullish = <T>(input: T): T => {
    if (Array.isArray(input)) {
        return input.filter((item) => item != null).map(removeNullish) as T;
    } else if (typeof input === "object" && input !== null) {
        return Object.fromEntries(
            Object.entries(input)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([_, value]) => value != null)
                .map(([key, value]) => [key, removeNullish(value)])
        ) as T;
    }
    return input;
};

/**
 * Validates the API response data against a provided schema and returns the parsed data if valid.
 *
 * This function ensures the data conforms to the expected schema by removing nullish values
 * and using the validation mechanism provided by the schema. If the data is invalid and
 * the application is in development mode, it logs the validation errors to the console.
 * In case of any validation errors, an error is thrown with a detailed message.
 *
 * @template TData - The expected type of the parsed data.
 * @param {unknown} data - The data returned by the API that needs to be validated.
 * @param {ZodSchema} schema - The Zod schema against which the data is validated.
 * @throws Will throw an error if the data does not align with the provided schema.
 * @returns {TData} - The parsed and validated data that aligns with the provided schema.
 */
export const validateApiResponse = <TData = unknown>(
    data: unknown,
    schema: ZodSchema
): TData => {
    const { errors, data: parsedData } = validateData(
        removeNullish(data),
        schema
    );

    if (checkIsDevMode()) {
        console.log(
            "[///////////////////////////////////////////////////////////////]"
        );
        console.log("[INVALID DATA]", errors);
    }

    if (errors) {
        throwError({
            message: checkIsDevMode()
                ? JSON.stringify(errors)
                : "The returned data does not align with the provided schema. Please contact the developers for more information and support.",
            status: HTTP_NOT_ACCEPTABLE,
        });
    }
    return parsedData as TData;
};
