# Utils Module

## Introduction

The Utils module provides a collection of utility functions and helpers for common tasks in JavaScript/TypeScript applications. These utilities cover a wide range of functionality including error handling, environment validation, formatting, data manipulation, and more. Each utility is designed to be simple, reusable, and type-safe.

## Available Utilities

### Error Handling

#### throwCustomError

Throws a custom error with the provided message and status code.

```typescript
function throwCustomError(message: string, statusCode: number): never
```

#### throwError

Throws a JSON-formatted error response.

```typescript
function throwError(error: ErrorType): never
```

#### safeRedirect

Safely redirects the user to the specified URL after validating it.

```typescript
function safeRedirect(to: RedirectUrl, init?: number | ResponseInit): Response
```

#### parseErrorResponse

Parses error responses from API calls into a standardized format.

```typescript
function parseErrorResponse(error: unknown): ErrorType
```

#### getErrorMessage

Extracts a human-readable error message from various error types.

```typescript
function getErrorMessage(error: unknown): string
```

#### isCustomErrorResponse

Checks if an error is a custom error response.

```typescript
function isCustomErrorResponse(error: unknown): boolean
```

### Environment Validation

#### validateEnv

Validates environment variables against a schema.

```typescript
function validateEnv<T extends z.ZodType>(
  schema: T,
  options?: EnvValidatorOptions
): z.infer<T>
```

#### createEnvSchema

Helper function to create a basic schema with common validation patterns.

```typescript
function createEnvSchema<T extends CreateEnvSchema>(envVars: T): z.ZodType<InferredType>
```

#### requiredIn, requiredInProduction, requiredInDevelopment, requiredInProdAndDev

Functions to specify in which environments a variable is required.

```typescript
function requiredIn(environments: Environment[]): z.RefinementEffect<string | undefined | boolean>["refinement"]
```

### Formatting

#### formatAmount

Formats a given monetary amount into a human-readable string with currency notation and appropriate abbreviations.

```typescript
function formatAmount(
  amount?: number,
  showCurrency: CurrencyVisibility = CurrencyVisibility.SHOW,
  options: FormatOptions = {
    decimals: 0,
    showAbbreviation: AbbreviationVisibility.SHOW,
  }
): string
```

#### getDurationFromNow

Calculates the duration from now to a given date.

```typescript
function getDurationFromNow(date: Date | string): string
```

#### generateAvatar

Generates an avatar URL based on a name or identifier.

```typescript
function generateAvatar(name: string, options?: AvatarOptions): string
```

### Data Manipulation

#### conditionallyAddToArray

Adds an item to an array only if a condition is met.

```typescript
function conditionallyAddToArray<T>(
  condition: boolean,
  item: T,
  array: T[] = []
): T[]
```

#### removeNullish

Removes nullish values (null or undefined) from an object.

```typescript
function removeNullish<T extends Record<string, unknown>>(obj: T): Partial<T>
```

#### getRequestFormData

Extracts form data from a request.

```typescript
function getRequestFormData(request: Request): Promise<FormData>
```

### URL and Query Parameters

#### parseSearchParams

Parses URL search parameters into a typed object.

```typescript
function parseSearchParams<T extends Record<string, string | number | boolean>>(
  searchParams: URLSearchParams
): ParsedSearchParams<T>
```

#### serializeQueryParams

Serializes an object into URL search parameters.

```typescript
function serializeQueryParams(
  params: Record<string, string | number | boolean | undefined>
): URLSearchParams
```

### Development Utilities

#### fakeNetwork

Simulates network latency for testing purposes.

```typescript
function fakeNetwork(delay?: number): Promise<void>
```

#### checkIsDevMode

Checks if the application is running in development mode.

```typescript
function checkIsDevMode(): boolean
```

## Usage Examples

### Error Handling

```typescript
import { throwCustomError, safeRedirect } from 'r3-utils/utils';

// In an action function
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email');
  
  if (!email) {
    // Throw a custom error with a 400 status code
    throwCustomError('Email is required', 400);
  }
  
  // Process the form...
  
  // Safely redirect to a success page
  return safeRedirect('/success');
}
```

### Environment Validation

```typescript
import { createEnvSchema, validateEnv } from 'r3-utils/utils';

// Create a schema for your environment variables
const envSchema = createEnvSchema({
  API_URL: { requiredIn: ['production', 'development'] },
  DEBUG: { type: 'boolean', default: false },
  PORT: { type: 'number', default: 3000 },
  API_KEY: { requiredIn: ['production'] },
});

// Validate environment variables
const env = validateEnv(envSchema);

// Use the validated and typed environment variables
console.log(`Server running on port ${env.PORT}`);
if (env.DEBUG) {
  console.log(`API URL: ${env.API_URL}`);
}
```

### Formatting

```typescript
import { 
  formatAmount, 
  CurrencyVisibility, 
  AbbreviationVisibility 
} from 'r3-utils/utils';

// Format a large amount with currency and abbreviation
const formattedPrice = formatAmount(1500000, CurrencyVisibility.SHOW, {
  decimals: 2,
  showAbbreviation: AbbreviationVisibility.SHOW
});
// Output: "TZS 1.50 M"

// Format without currency
const formattedAmount = formatAmount(1500000, CurrencyVisibility.HIDE, {
  decimals: 0,
  showAbbreviation: AbbreviationVisibility.SHOW
});
// Output: "2 M"

// Format without abbreviation
const fullAmount = formatAmount(1500000, CurrencyVisibility.SHOW, {
  decimals: 2,
  showAbbreviation: AbbreviationVisibility.HIDE
});
// Output: "TZS 1,500,000.00"
```

### Data Manipulation

```typescript
import { conditionallyAddToArray, removeNullish } from 'r3-utils/utils';

// Add an item to an array only if a condition is met
const isAdmin = user.role === 'admin';
const menuItems = [
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'Profile', url: '/profile' },
];

const adminMenuItems = conditionallyAddToArray(
  isAdmin,
  { name: 'Admin Panel', url: '/admin' },
  menuItems
);

// Remove nullish values from an object
const userInput = {
  name: 'John',
  email: 'john@example.com',
  phone: null,
  address: undefined,
};

const cleanInput = removeNullish(userInput);
// Output: { name: 'John', email: 'john@example.com' }
```

### URL and Query Parameters

```typescript
import { parseSearchParams, serializeQueryParams } from 'r3-utils/utils';

// In a component that needs to parse URL search parameters
function SearchResults() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Parse search parameters into a typed object
  const params = parseSearchParams<{
    q: string;
    page: number;
    sort: string;
  }>(searchParams);
  
  // Use the typed parameters
  console.log(`Searching for: ${params.q}`);
  console.log(`Page: ${params.page}`);
  
  // Create new search parameters
  const newParams = {
    q: params.q,
    page: params.page + 1,
    sort: 'date',
  };
  
  // Serialize parameters back to URL search parameters
  const newSearchParams = serializeQueryParams(newParams);
  
  return (
    <Link to={`/search?${newSearchParams}`}>Next Page</Link>
  );
}
```

## Best Practices

1. **Import Only What You Need**: Import only the specific utilities you need rather than importing everything from the module.

2. **Type Safety**: Take advantage of TypeScript generics and type definitions provided by these utilities to ensure type safety in your application.

3. **Error Handling**: Use the error handling utilities consistently throughout your application to provide a uniform approach to error management.

4. **Environment Configuration**: Use the environment validation utilities to ensure your application has all the required environment variables before it starts.

5. **Formatting Consistency**: Use the formatting utilities to ensure consistent formatting of values (like currency amounts) throughout your application.

6. **Testing**: When testing components that use network requests, use the `fakeNetwork` utility to simulate network latency.

## Integration with React Router

Many of these utilities are designed to work seamlessly with React Router, especially the error handling and redirection utilities. Make sure you have React Router installed and properly set up in your application to use these utilities effectively.