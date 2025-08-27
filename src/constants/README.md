# Constants Module

## Introduction

The Constants module provides a collection of commonly used HTTP status codes and network error codes as constants. Using these constants instead of hardcoded values improves code readability, maintainability, and helps prevent typos.

## Available Constants

### HTTP Status Codes

```typescript
// 4xx Client Errors
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403
HTTP_NOT_FOUND = 404
HTTP_METHOD_NOT_ALLOWED = 405
HTTP_NOT_ACCEPTABLE = 406

// 5xx Server Errors
HTTP_INTERNAL_SERVER_ERROR = 500
HTTP_SERVICE_NOT_AVAILABLE = 503

// Custom Error Codes
OFFLINE_ERROR_CODE = 600
```

### Network Error Codes

```typescript
NETWORK_ERROR_CODE = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH']
```

## Usage Examples

### HTTP Status Codes

```typescript
import { 
  HTTP_BAD_REQUEST, 
  HTTP_UNAUTHORIZED, 
  HTTP_NOT_FOUND 
} from 'r3-utils/constants';

// In an API response handler
function handleApiResponse(response) {
  switch (response.status) {
    case HTTP_BAD_REQUEST:
      return { error: 'Invalid request parameters' };
    case HTTP_UNAUTHORIZED:
      return { error: 'Authentication required' };
    case HTTP_NOT_FOUND:
      return { error: 'Resource not found' };
    default:
      return response.data;
  }
}
```

### Network Error Handling

```typescript
import { NETWORK_ERROR_CODE, OFFLINE_ERROR_CODE } from 'r3-utils/constants';

// In an error handler
function handleNetworkError(error) {
  if (error.code && NETWORK_ERROR_CODE.includes(error.code)) {
    console.error('Network connectivity issue:', error.code);
    return {
      status: OFFLINE_ERROR_CODE,
      message: 'You appear to be offline. Please check your connection.'
    };
  }
  
  // Handle other errors
  return {
    status: error.status || 500,
    message: error.message || 'An unknown error occurred'
  };
}
```

## Best Practices

1. **Use Constants Instead of Magic Numbers**: Always use these constants instead of hardcoded status codes to improve code readability and maintainability.

2. **Import Only What You Need**: Import only the specific constants you need rather than importing everything.

3. **Consistent Error Handling**: Use these constants consistently across your application for error handling to ensure a uniform approach.

4. **Documentation**: When using these constants in error handling logic, add comments to explain the specific scenarios being handled.

