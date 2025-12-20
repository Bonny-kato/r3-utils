import { RawCreateParams, Schema, z, ZodSchema, ZodString } from "zod";

/**
 * Schema definition for pagination data.
 *
 * This schema validates the structure of a pagination object,
 * ensuring proper data types and providing informative error messages.
 *
 * The `PaginationSchema` expects an object with the following properties:
 * - `totalPages`: A number that represents the total number of pages.
 * - `currentPage`: A number that represents the current active page.
 *
 * An error message is returned if the object does not conform to the expected structure
 * or if any property's value is of an incorrect type.
 */
export const PaginationSchema = z.object(
    {
        currentPage: z.number({
            message: "currentPage must be a number",
        }),
        totalPages: z.number({
            message: "totalPages must be a number",
        }),
    },
    { message: "pagination object is required" }
);

export type PaginationType = z.infer<typeof PaginationSchema>;

//-------------------------------------------------

type RefinementContext = z.RefinementCtx;

/**
 * Creates a refinement function that checks if a value optionally adheres to the provided Zod schema.
 *
 * @template T - The type of the value to be validated.
 * @param {z.ZodType<T>} schema - The Zod schema against which the value is validated.
 * @param {string} errorMessage - The custom error message to use when validation fails.
 * @returns {z.RefinementEffect<T>["refinement"]} A refinement function to be used within a Zod schema for optional validation.
 *
 * The refinement function ensures that non-null and non-undefined values comply with the specified schema.
 * If the value does not pass the schema's validation, a custom issue is added to the context with the
 * specified error message.
 */
export const createOptionalRefinement =
    <T>(
        schema: z.ZodType<T>,
        errorMessage: string
    ): z.RefinementEffect<T>["refinement"] =>
    (value, ctx: RefinementContext) => {
        if (value && !schema.safeParse(value).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: errorMessage + ctx.path.join("."),
            });
        } else return true;
    };

//-------------------------------------------------
/**
 * A schema function designed to validate and structure paginated API responses.
 *
 * @template T - A generic type extending ZodType, used to define the schema of individual items in the "data" array.
 * @param {T} schema - The Zod schema representing the expected structure of elements in the "data" array.
 * @returns {z.ZodObject} A Zod object schema verifying that the response includes:
 *                        - "data": An array matching the provided schema.
 *                        - "pagination": An object adhering to the PaginationSchema.
 *                        Ensures the overall format of the API response is valid.
 */
export const ApiListSchema = <T extends z.ZodType>(schema: T) => {
    return z.object(
        {
            data: z.array(schema),
            pagination: PaginationSchema,
        },
        { message: "Invalid data returned" }
    );
};

//--------------------------------------------------------------

/**
 * ApiDetailsSchema is a function that takes a Zod schema as input and returns
 * a new ZodObject schema with a single property `data` that follows the provided
 * input schema.
 *
 * @param {T} schema - A ZodType indicating the schema that the `data` property should adhere to.
 * @returns {z.ZodObject<{ data: T }>} - A ZodObject schema with a `data` property based on the provided schema.
 */
export const ApiDetailsSchema = <T extends z.ZodType>(
    schema: T
): z.ZodObject<{ data: T }> => {
    return z.object({
        data: schema,
    });
};

//--------------------------------------------------------------

/**
 * Validates whether a given string contains only alphabetic characters, spaces, or hyphens.
 *
 * @param {string} label - A label that will be used in the generated error messages.
 * @returns {ZodSchema} A Zod schema that enforces the string to:
 *                      - Be a valid string
 *                      - Not be empty
 *                      - Contain only alphabetic characters, spaces, or hyphens
 */
export const ContainOnlyAlphabetic = (label: string): ZodSchema => {
    return z
        .string({ message: `${label} must be a string` })
        .trim()
        .min(1, { message: `${label} must be none-empty string` })
        .regex(/^[a-zA-Z\s-]+$/, { message: `${label} must be a string` });
};

//--------------------------------------------------------------

/**
 * SelectOptionSchema defines the structure and validation rules for an object
 * representing a selectable option in a form or dropdown.
 *
 * Properties:
 * - `label`: A string that represents the human-readable name for the option.
 *   It must be at least one character long. Validation error message: "label type must be a number".
 *
 * - `value`: Either a number or a string. If the value is not in the expected format,
 *   it will attempt to coerce to the appropriate type. Validation error messages:
 *   "value must be a number" or "value must be a string".
 *
 * - `selected`: An optional boolean indicating whether the option is pre-selected.
 *   Defaults to `false` if not provided. Validation error message: "selected must be a boolean".
 */
export const SelectOptionSchema = z.object({
    label: z.string().min(1, { message: "label type must be a number" }),
    selected: z
        .boolean({ message: "selected must be a boolean" })
        .optional()
        .default(false),
    value: z.coerce
        .number({ message: "value must be a number" })
        .or(z.coerce.string({ message: "value must be a string" })),
});

export type SelectInputOptionType = z.infer<typeof SelectOptionSchema>;

//--------------------------------------------------------------

/**
 * `NoneEmptyStringSchema` is a schema generator function used to validate
 * a string input. It ensures that the value provided is a non-empty string.
 * The error messages for validation failures are contextualized with the
 * specified label passed as an argument.
 *
 * @param {string} label - The label used in the error message to specify
 *                         the field being validated.
 * @returns {ZodString} A Zod schema enforcing the string to be non-empty.
 */
export const NoneEmptyStringSchema = (label: string): ZodString => {
    return z
        .string({ message: `${label} must be a string` })
        .min(1, { message: `${label} must be none-empty string` });
};

//--------------------------------------------------------------

const TZ_MOBILE_NO_REGEX = /^(\+?255|0)[6-9]\d{8}$/;

/**
 * TanzaniaMobileNumberSchema is a schema definition used to validate Tanzanian mobile phone numbers.
 * It ensures that the input is a non-empty string and matches the specified Tanzanian mobile number format.
 * The validation utilizes a regular expression (TZ_MOBILE_NO_REGEX) to enforce the structure of valid phone numbers.
 *
 * Constraints:
 * - The input must be a non-empty string.
 * - The input must conform to the Tanzanian mobile number regular expression defined in TZ_MOBILE_NO_REGEX.
 *
 * Validation Error:
 * - If the input does not match the Tanzanian mobile number format, the validation error message "invalid phone number" will be raised.
 */
export const TanzaniaMobileNumberSchema = NoneEmptyStringSchema(
    "phoneNumber"
).regex(TZ_MOBILE_NO_REGEX, { message: "invalid phone number" });

//--------------------------------------------------------------

/**
 * OptionalEmailSchema is a validation schema for an optional email string.
 * It leverages the zod library to define a string schema that validates
 * whether the provided input is a valid email format but allows it to be optional.
 *
 * The schema uses a custom refinement to perform additional validation checks
 * for email formatting. If an invalid email is provided, the schema will
 * respond with a validation error.
 */
export const OptionalEmailSchema = (label?: string) =>
    z
        .string({ message: `${label} must be a string` })
        .optional()
        .default("")
        .superRefine(
            createOptionalRefinement(
                z.string().email(),
                `Invalid email address for ${label}`
            )
        );

//--------------------------------------------------------------

/**
 * PositiveNumberSchema is a validation schema designed to ensure that a given input adheres to the following rules:
 * 1. The input must be coercible to a number. If not, a validation error message "field must be a number" is returned.
 * 2. The input must be a non-negative number (either zero or positive). If this condition is not met,
 *    a validation error message "field must be a non-negative number" is returned.
 *
 * This schema is useful for validating numeric data that is required to be positive or zero while
 * gracefully handling non-numeric inputs.
 */
export const PositiveNumberSchema = z.coerce
    .number({ message: `field must be a number` })
    .positive({ message: `field must be a non-negative number` });

//--------------------------------------------------------------

/**
 * Schema definition for the structure of an object that includes a label and a value.
 * The schema validates the following properties:
 *
 * - label: A non-empty string. The specific validation is defined by the `NoneEmptyStringSchema` function using "label" as a parameter.
 * - value: Can be a string, number, or boolean. The value type is validated using a union schema.
 *
 * Used to ensure strict validation of objects matching the label and value structure.
 */
export const LabelAndValueSchema = z.object({
    label: NoneEmptyStringSchema("label"),
    value: z.union([z.string(), z.number(), z.boolean()]),
});

// ---------------------------------------------------------------

/**
 * Creates a Zod array schema ensuring at least one item of a specified schema type.
 * @param schema - Zod schema for array items
 * @param params - Optional raw create parameters
 * @returns Zod array schema with min 1 item
 */
export const AtLeastOneArrayItemSchema = <T extends Schema>(
    schema: T,
    params?: RawCreateParams
) => {
    return z.array(schema, params).min(1);
};
