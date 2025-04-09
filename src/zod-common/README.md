# Zod Common Module

## Introduction

The Zod Common module provides a collection of reusable [Zod](https://github.com/colinhacks/zod) schemas and utilities for common validation patterns in TypeScript applications. These schemas help ensure data validation, type safety, and consistent error messages across your application. The module is particularly useful for validating API responses, form inputs, and configuration data.

## Features

- Pre-defined schemas for common data structures
- Utilities for creating custom validation rules
- Type inference for validated data
- Consistent error messages
- Integration with TypeScript for type safety

## Available Schemas

### API Response Schemas

#### ApiListSchema

A schema for validating paginated API responses.

```typescript
function ApiListSchema<T extends z.ZodType>(schema: T): z.ZodObject
```

#### ApiDetailsSchema

A schema for validating API detail responses.

```typescript
function ApiDetailsSchema<T extends z.ZodType>(schema: T): z.ZodObject<{ data: T }>
```

#### PaginationSchema

A schema for validating pagination data.

```typescript
const PaginationSchema: z.ZodObject<{
  totalPages: z.ZodNumber;
  currentPage: z.ZodNumber;
}>
```

### Form Input Schemas

#### ContainOnlyAlphabetic

A schema that validates whether a string contains only alphabetic characters, spaces, or hyphens.

```typescript
function ContainOnlyAlphabetic(label: string): ZodSchema
```

#### SelectOptionSchema

A schema for validating select input options.

```typescript
const SelectOptionSchema: z.ZodObject<{
  label: z.ZodString;
  value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
  selected: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}>
```

#### NoneEmptyStringSchema

A schema for validating non-empty strings.

```typescript
function NoneEmptyStringSchema(label: string): ZodString
```

### Format-Specific Schemas

#### TanzaniaMobileNumberSchema

A schema for validating Tanzanian mobile phone numbers.

```typescript
const TanzaniaMobileNumberSchema: ZodString
```

#### OptionalEmailSchema

A schema for validating optional email addresses.

```typescript
const OptionalEmailSchema: z.ZodString
```

#### PositiveNumberSchema

A schema for validating positive numbers.

```typescript
const PositiveNumberSchema: z.ZodNumber
```

### Utility Functions

#### createOptionalRefinement

Creates a refinement function that checks if a value optionally adheres to the provided Zod schema.

```typescript
function createOptionalRefinement<T>(
  schema: z.ZodType<T>, 
  errorMessage: string
): z.RefinementEffect<T>["refinement"]
```

## Usage Examples

### Validating API Responses

```typescript
import { ApiListSchema, ApiDetailsSchema } from 'r3-utils/zod-common';
import { z } from 'zod';

// Define a schema for a user object
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

// Create a schema for a paginated list of users
const UserListSchema = ApiListSchema(UserSchema);

// Create a schema for a single user response
const UserDetailsSchema = ApiDetailsSchema(UserSchema);

// Use the schemas to validate API responses
async function fetchUsers() {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  // Validate and type the response data
  const result = UserListSchema.safeParse(data);
  
  if (result.success) {
    // TypeScript knows the shape of the data
    const users = result.data.data;
    const pagination = result.data.pagination;
    
    console.log(`Showing page ${pagination.currentPage} of ${pagination.totalPages}`);
    return users;
  } else {
    console.error('Invalid API response:', result.error);
    return [];
  }
}

async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  
  // Validate and type the response data
  const result = UserDetailsSchema.safeParse(data);
  
  if (result.success) {
    return result.data.data;
  } else {
    console.error('Invalid API response:', result.error);
    return null;
  }
}
```

### Validating Form Inputs

```typescript
import { 
  NoneEmptyStringSchema, 
  TanzaniaMobileNumberSchema, 
  OptionalEmailSchema,
  PositiveNumberSchema
} from 'r3-utils/zod-common';
import { z } from 'zod';

// Define a schema for a contact form
const ContactFormSchema = z.object({
  name: NoneEmptyStringSchema('Name'),
  phone: TanzaniaMobileNumberSchema,
  email: OptionalEmailSchema,
  age: PositiveNumberSchema,
  message: z.string().min(10, { message: 'Message must be at least 10 characters' }),
});

// Use the schema to validate form data
function validateContactForm(formData: unknown) {
  const result = ContactFormSchema.safeParse(formData);
  
  if (result.success) {
    // Form data is valid
    submitForm(result.data);
  } else {
    // Form data is invalid
    displayErrors(result.error.format());
  }
}

// Example form submission handler
function handleSubmit(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target));
  validateContactForm(formData);
}
```

### Creating Select Options

```typescript
import { SelectOptionSchema } from 'r3-utils/zod-common';
import { z } from 'zod';

// Define a schema for a list of select options
const SelectOptionsSchema = z.array(SelectOptionSchema);

// Validate options data
function validateOptions(options: unknown) {
  const result = SelectOptionsSchema.safeParse(options);
  
  if (result.success) {
    return result.data;
  } else {
    console.error('Invalid options data:', result.error);
    return [];
  }
}

// Example usage
const rawOptions = [
  { label: 'Option 1', value: 1 },
  { label: 'Option 2', value: '2', selected: true },
  { label: 'Option 3', value: 3 }
];

const validatedOptions = validateOptions(rawOptions);

// Render select options
function renderSelect(options) {
  return `
    <select>
      ${options.map(option => `
        <option 
          value="${option.value}" 
          ${option.selected ? 'selected' : ''}
        >
          ${option.label}
        </option>
      `).join('')}
    </select>
  `;
}
```

### Custom Validation with Refinements

```typescript
import { createOptionalRefinement } from 'r3-utils/zod-common';
import { z } from 'zod';

// Create a custom schema for a password field
const PasswordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .superRefine(createOptionalRefinement(
    z.string().regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' }),
    'Password must contain at least one uppercase letter'
  ))
  .superRefine(createOptionalRefinement(
    z.string().regex(/[0-9]/, { message: 'Password must contain at least one number' }),
    'Password must contain at least one number'
  ));

// Use the schema to validate a password
function validatePassword(password: string) {
  const result = PasswordSchema.safeParse(password);
  
  if (result.success) {
    return { valid: true, value: result.data };
  } else {
    return { 
      valid: false, 
      errors: result.error.errors.map(err => err.message) 
    };
  }
}

// Example usage
console.log(validatePassword('password')); // Invalid: too short, no uppercase, no number
console.log(validatePassword('Password1')); // Valid
```

## Best Practices

1. **Combine Schemas**: Combine these pre-defined schemas to create more complex validation rules for your specific use cases.

2. **Type Inference**: Use Zod's type inference capabilities to ensure type safety in your application.

```typescript
import { ApiListSchema } from 'r3-utils/zod-common';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const UserListSchema = ApiListSchema(UserSchema);

// Infer the type from the schema
type UserListResponse = z.infer<typeof UserListSchema>;

// TypeScript now knows the shape of the data
function processUsers(response: UserListResponse) {
  const users = response.data;
  const pagination = response.pagination;
  // ...
}
```

3. **Error Handling**: Use Zod's error formatting capabilities to display user-friendly error messages.

```typescript
function validateForm(data: unknown) {
  const result = FormSchema.safeParse(data);
  
  if (!result.success) {
    const formattedErrors = result.error.format();
    
    // Display errors next to form fields
    Object.entries(formattedErrors).forEach(([field, error]) => {
      if (field !== '_errors') {
        const errorMessage = error._errors.join(', ');
        displayFieldError(field, errorMessage);
      }
    });
    
    return false;
  }
  
  return result.data;
}
```

4. **Validation Pipeline**: Use these schemas as part of a validation pipeline in your application, from API requests to form submissions.

5. **Custom Schemas**: Extend these schemas with your own custom validation rules using Zod's refinement capabilities.

## Integration with React

These schemas can be easily integrated with React form libraries like React Hook Form or Formik:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NoneEmptyStringSchema, OptionalEmailSchema } from 'r3-utils/zod-common';
import { z } from 'zod';

// Define a schema for a contact form
const ContactFormSchema = z.object({
  name: NoneEmptyStringSchema('Name'),
  email: OptionalEmailSchema,
  message: z.string().min(10, { message: 'Message must be at least 10 characters' }),
});

// Infer the type from the schema
type ContactFormValues = z.infer<typeof ContactFormSchema>;

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormValues>({
    resolver: zodResolver(ContactFormSchema)
  });
  
  const onSubmit = (data: ContactFormValues) => {
    console.log(data);
    // Submit the form data
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" {...register('email')} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" {...register('message')} />
        {errors.message && <p>{errors.message.message}</p>}
      </div>
      
      <button type="submit">Submit</button>
    </form>
  );
}
```